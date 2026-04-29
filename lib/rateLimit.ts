// Distributed rate limiter using Upstash Redis.
// Falls back to allowing the request if Redis is unavailable (e.g. local dev without Redis configured).

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

/**
 * Returns true if the request is allowed, false if rate limited.
 * @param key      Unique key (e.g. "login:1.2.3.4")
 * @param limit    Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const store = getRedis();
    if (!store) return true;
    const windowSec = Math.ceil(windowMs / 1000);
    const count = await store.incr(key);
    if (count === 1) await store.expire(key, windowSec);
    return count <= limit;
  } catch (e) {
    // Allow on any Redis error rather than block legitimate users, but surface it
    console.error("[rateLimit] Redis error — failing open for key", key, e);
    return true;
  }
}

/** Extract the real client IP from a Next.js request */
export function clientIp(req: Request): string {
  return (
    (req.headers as Headers).get("x-forwarded-for")?.split(",")[0].trim() ??
    (req.headers as Headers).get("x-real-ip") ??
    "unknown"
  );
}
