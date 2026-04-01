// In-memory sliding window rate limiter (sufficient for single-instance; swap for Redis in multi-instance prod)
const store = new Map<string, number[]>();

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) return false;
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of store.entries()) {
    const fresh = timestamps.filter((t) => now - t < 3_600_000);
    if (fresh.length === 0) store.delete(key);
    else store.set(key, fresh);
  }
}, 300_000);
