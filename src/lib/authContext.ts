import "server-only";

export const AUTH_CONTEXT_HEADER = "x-galaxy-auth";

type AuthMethod = "clerk" | "api_key" | "dev_bypass";

type RequestAuth = {
  userId: string;
  method: AuthMethod;
  sessionId?: string;
  apiKeyId?: string;
};

type SignedAuthPayload = RequestAuth & { exp: number };

const AUTH_CONTEXT_TTL_SEC = 60;

function getSigningSecret(): string {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(body: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`auth:${body}`),
  );
  return toBase64Url(new Uint8Array(sig));
}

/** Signed auth context for trusted frontend-server → backend calls. */
export async function encodeAuthContext(auth: RequestAuth): Promise<string> {
  const secret = getSigningSecret();
  const exp = Math.floor(Date.now() / 1000) + AUTH_CONTEXT_TTL_SEC;
  const body = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({ ...auth, exp } satisfies SignedAuthPayload),
    ),
  );
  return `${body}.${await sign(body, secret)}`;
}
