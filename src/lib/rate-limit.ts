/**
 * Lightweight in-memory rate limiter, keyed by an arbitrary string
 * (e.g. `login:${mobileNumber}` or `admin-login:${ip}`).
 *
 * NOTE: this resets on server restart and is per-process — fine for a
 * single-instance deployment. For multi-instance production deployments,
 * swap the Map below for a shared store (e.g. Redis) behind the same
 * `consume()` interface.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function consume(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true };
}
