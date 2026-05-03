/*
  Simple in-memory rate limiter. Fine for this traffic profile.
  In multi-instance deployments, swap for Redis.
*/

type Record = { count: number; expiresAt: number };
const buckets = new Map<string, Record>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetMs: number;
};

export function rateLimit(
  key: string,
  options: { max: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();

  // Periodic sweep — cheap, run inline at most once per minute
  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    for (const [k, rec] of buckets) {
      if (rec.expiresAt < now) buckets.delete(k);
    }
    lastSweep = now;
  }

  const rec = buckets.get(key);
  if (!rec || rec.expiresAt < now) {
    buckets.set(key, { count: 1, expiresAt: now + options.windowMs });
    return { ok: true, remaining: options.max - 1, resetMs: options.windowMs };
  }
  if (rec.count >= options.max) {
    return { ok: false, remaining: 0, resetMs: rec.expiresAt - now };
  }
  rec.count += 1;
  return {
    ok: true,
    remaining: options.max - rec.count,
    resetMs: rec.expiresAt - now,
  };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
