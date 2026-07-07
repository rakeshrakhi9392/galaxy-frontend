export type BackendErrorPayload = {
  error: {
    code: string;
    message: string;
    cause?: string;
    metadata?: Record<string, unknown>;
    retryability?: "none" | "retry_after" | "backoff";
    details?: unknown;
  };
};

function getServerBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4010";
}

/** Same-origin API path for browser requests (proxied via next.config rewrites). */
export function getClientApiPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildJsonHeaders(init?: RequestInit): HeadersInit {
  const headers = new Headers(init?.headers);
  // FormData must set its own multipart boundary — do not force JSON content-type.
  if (
    init?.body != null &&
    !headers.has("content-type") &&
    !(typeof FormData !== "undefined" && init.body instanceof FormData)
  ) {
    headers.set("content-type", "application/json");
  }
  return headers;
}

export async function backendFetch(path: string, init?: RequestInit) {
  const url = `${getServerBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: buildJsonHeaders(init),
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const json = (await res.json()) as BackendErrorPayload;
      const cause = json?.error?.cause;
      msg = json?.error?.message ?? msg;
      if (cause) msg = `${msg}: ${cause}`;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res;
}

const DEFAULT_FETCH_MAX_RETRIES = 2;
const DEFAULT_FETCH_BASE_DELAY_MS = 500;

const TRANSIENT_HTTP_STATUSES = new Set([429, 502, 503, 504]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True for browser network failures (offline, CORS proxy down, connection reset). */
export function isNetworkFetchError(err: unknown): boolean {
  return (
    err instanceof TypeError &&
    (err.message === "Failed to fetch" || err.message.includes("NetworkError"))
  );
}

function isTransientHttpStatus(status: number): boolean {
  return TRANSIENT_HTTP_STATUSES.has(status);
}

export type FetchWithRetryOptions = {
  /** Extra attempts after the first try (default 2 → 3 total). */
  maxRetries?: number;
  baseDelayMs?: number;
};

/** Browser-safe fetch via the frontend proxy (`/api/v1/*` → backend). Does not throw on HTTP errors. */
export async function clientRequest(path: string, init?: RequestInit): Promise<Response> {
  const url = getClientApiPath(path);
  return fetch(url, {
    ...init,
    headers: buildJsonHeaders(init),
    cache: "no-store",
  });
}

/** `clientRequest` with linear backoff on network errors and transient HTTP statuses. */
export async function clientRequestWithRetry(
  path: string,
  init?: RequestInit,
  options?: FetchWithRetryOptions,
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? DEFAULT_FETCH_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_FETCH_BASE_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const res = await clientRequest(path, init);
      if (res.ok || !isTransientHttpStatus(res.status) || attempt >= maxRetries) {
        return res;
      }
      await delay(baseDelayMs * (attempt + 1));
    } catch (err) {
      lastError = err;
      if (!isNetworkFetchError(err) || attempt >= maxRetries) {
        throw enrichRetryExhaustedError(err, attempt + 1);
      }
      await delay(baseDelayMs * (attempt + 1));
    }
  }

  throw enrichRetryExhaustedError(lastError, maxRetries + 1);
}

function enrichRetryExhaustedError(err: unknown, attempts: number): Error {
  if (err instanceof Error) {
    if (isNetworkFetchError(err)) {
      return new Error(
        `Could not reach the API after ${attempts} attempts. Is the backend running?`,
      );
    }
    return err;
  }
  return new Error(`Request failed after ${attempts} attempts`);
}

export async function readBackendErrorMessage(
  res: Response,
  fallback = `Request failed (${res.status})`,
): Promise<string> {
  let msg = fallback;
  try {
    const json = (await res.clone().json()) as BackendErrorPayload;
    const cause = json?.error?.cause;
    msg = json?.error?.message ?? msg;
    if (cause) msg = `${msg}: ${cause}`;
  } catch {
    // ignore non-JSON error bodies
  }
  return msg;
}

/** Browser-safe fetch via the frontend proxy (`/api/v1/*` → backend). Retries transient failures. */
export async function clientFetch(path: string, init?: RequestInit, options?: FetchWithRetryOptions) {
  const res = await clientRequestWithRetry(path, init, options);

  if (!res.ok) {
    throw new Error(await readBackendErrorMessage(res));
  }

  return res;
}

/** Browser-safe SSE URL via the frontend proxy. */
export function clientEventsUrl(path: string) {
  return getClientApiPath(path);
}
