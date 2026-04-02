// Distributed rate limiter using Vercel KV (Redis).
// Falls back to allowing the request if KV is unavailable (e.g. local dev without KV configured).

let kv: typeof import("@vercel/kv").kv | null = null;

async function getKv() {
  if (kv) return kv;
  try {
    const mod = await import("@vercel/kv");
    kv = mod.kv;
    return kv;
  } catch {
    return null;
  }
}

/**
 * Returns true if the request is allowed, false if rate limited.
 * @param key      Unique key (e.g. "login:1.2.3.4")
 * @param limit    Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const store = await getKv();

  // Fallback: allow if KV not available (local dev)
  if (!store) return true;

  try {
    const windowSec = Math.ceil(windowMs / 1000);
    const count = await store.incr(key);
    if (count === 1) await store.expire(key, windowSec);
    return count <= limit;
  } catch {
    // Allow on KV error rather than block legitimate users
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
