// Refresh token revocation via Redis blocklist.
// When a user logs out or a token is revoked, the token's jti/hash is stored
// in Redis with a TTL matching the token's remaining lifetime.

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

// Add a refresh token to the blocklist. ttlSeconds = remaining token lifetime.
export async function blockRefreshToken(tokenHash: string, ttlSeconds: number): Promise<void> {
  const store = getRedis();
  if (!store) return;
  try {
    await store.set(`revoked:${tokenHash}`, "1", { ex: ttlSeconds });
  } catch { /* non-fatal */ }
}

// Check if a refresh token is blocklisted.
export async function isRefreshTokenBlocked(tokenHash: string): Promise<boolean> {
  const store = getRedis();
  if (!store) return false;
  try {
    const val = await store.get(`revoked:${tokenHash}`);
    return val === "1";
  } catch {
    return false;
  }
}
