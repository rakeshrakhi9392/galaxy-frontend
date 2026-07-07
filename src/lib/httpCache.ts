import { readBackendErrorMessage } from "@/lib/backend";

type CacheEntry<T> = {
  etag: string;
  body: T;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function invalidateHttpCache(pathPrefix?: string) {
  if (!pathPrefix) {
    memoryCache.clear();
    return;
  }

  for (const key of [...memoryCache.keys()]) {
    if (key === pathPrefix || key.startsWith(pathPrefix)) {
      memoryCache.delete(key);
    }
  }
}

type RequestFn = (path: string, init?: RequestInit) => Promise<Response>;

/**
 * Conditional GET: sends If-None-Match when a prior representation is cached.
 * On 304, returns the cached body (304 has no payload).
 */
export async function fetchJsonWithEtag<T>(
  path: string,
  parse: (data: unknown) => T,
  request: RequestFn,
): Promise<T> {
  const cached = memoryCache.get(path) as CacheEntry<T> | undefined;
  const headers: HeadersInit = {};
  if (cached?.etag) {
    headers["If-None-Match"] = cached.etag;
  }

  const res = await request(path, { headers });

  if (res.status === 304) {
    if (!cached) {
      throw new Error("Received 304 Not Modified without a cached representation");
    }
    return cached.body;
  }

  if (!res.ok) {
    throw new Error(await readBackendErrorMessage(res));
  }

  const body = parse(await res.json());
  const etag = res.headers.get("ETag");
  if (etag) {
    memoryCache.set(path, { etag, body });
  }

  return body;
}
