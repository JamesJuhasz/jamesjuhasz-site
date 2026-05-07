/*
  Edge-compatible signed-cookie session for /admin.
  Cookie value: `${expiresAtMs}.${base64urlHmac}`. We sign expiresAtMs with
  ADMIN_SESSION_SECRET via Web Crypto so the same code runs in middleware
  (edge) and route handlers (node). No DB row needed — stateless.
*/

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set and at least 16 chars long.",
    );
  }
  return s;
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64url(sig);
}

export async function createSessionToken(
  ttlSeconds = MAX_AGE_SECONDS,
): Promise<string> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const sig = await hmac(String(expiresAt));
  return `${expiresAt}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<
  { ok: true; expiresAt: number } | { ok: false }
> {
  if (!token) return { ok: false };
  const dot = token.indexOf(".");
  if (dot < 1) return { ok: false };
  const expiresAtStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return { ok: false };
  }
  const expected = await hmac(expiresAtStr);
  // constant-time-ish: compare byte-by-byte after length check
  if (expected.length !== sig.length) return { ok: false };
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (mismatch !== 0) return { ok: false };
  return { ok: true, expiresAt };
}

export const ADMIN_SESSION_COOKIE = COOKIE_NAME;
export const ADMIN_SESSION_MAX_AGE = MAX_AGE_SECONDS;
