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

// A12: rotation grace window. Multi-tab race: two tabs refresh with the same
// token; the loser used to get 401 and a broken session. At rotation the
// replacement pair is cached for 30s keyed by the OLD token's hash — a reuse
// inside the window gets the SAME new pair; after the window, 401 as before.
// Redis-less fallback: rotation isn't enforced at all without Redis (blocked
// is always false), so the race can't happen and the grace cache is moot.
const GRACE_TTL_SECONDS = 30;

export interface RotationGracePair {
  accessToken: string;
  refreshToken: string;
}

export async function storeRotationGrace(oldTokenHash: string, pair: RotationGracePair): Promise<void> {
  const store = getRedis();
  if (!store) return;
  try {
    await store.set(`grace:${oldTokenHash}`, JSON.stringify(pair), { ex: GRACE_TTL_SECONDS });
  } catch { /* non-fatal — loser of the race just gets the 401 path */ }
}

export async function getRotationGrace(oldTokenHash: string): Promise<RotationGracePair | null> {
  const store = getRedis();
  if (!store) return null;
  try {
    const val = await store.get(`grace:${oldTokenHash}`);
    if (!val) return null;
    // @upstash/redis may auto-deserialize JSON values.
    const parsed = typeof val === "string" ? JSON.parse(val) : (val as Record<string, unknown>);
    if (typeof parsed?.accessToken === "string" && typeof parsed?.refreshToken === "string") {
      return parsed as unknown as RotationGracePair;
    }
    return null;
  } catch {
    return null; // fail toward the strict 401 path
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
