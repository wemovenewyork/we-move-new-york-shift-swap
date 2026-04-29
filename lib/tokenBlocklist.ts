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
    return true; // fail closed — if Redis is down, treat token as revoked
  }
}

// Force-invalidate all outstanding access tokens for a user (logout-all).
// Stores a timestamp; any access token issued before it is rejected.
// TTL = 900s (15 min) — matches the access token lifetime.
export async function blockUserAccessTokens(userId: string): Promise<void> {
  const store = getRedis();
  if (!store) return;
  try {
    await store.set(`force-logout:${userId}`, String(Date.now()), { ex: 900 });
  } catch { /* non-fatal */ }
}

// Returns true if the token (identified by its iat in ms) was issued before a force-logout.
export async function isUserForcedLogout(userId: string, iatMs: number): Promise<boolean> {
  const store = getRedis();
  if (!store) return false;
  try {
    const val = await store.get(`force-logout:${userId}`);
    if (!val) return false;
    return iatMs < Number(val);
  } catch {
    return false; // fail open — don't lock out users if Redis is down
  }
}
