/*
  Admin password verification. Constant-time compare against ADMIN_PASSWORD.
  Shared by sign-in and any sensitive action that re-prompts (e.g. broadcasts).
*/

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "wrong_password" };

export function verifyAdminPassword(input: string): VerifyResult {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { ok: false, reason: "not_configured" };

  const a = input;
  const b = expected;
  let mismatch = a.length === b.length ? 0 : 1;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0 ? { ok: true } : { ok: false, reason: "wrong_password" };
}
