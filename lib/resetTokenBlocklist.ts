// Reset token single-use enforcement via Redis blocklist.
// After a reset token is consumed, its hash is stored in Redis with a TTL
// matching the token's remaining lifetime (up to 1 hour). Any replay attempt
// will find the key and be rejected.

import { Redis } from "@upstash/redis";
import crypto from "crypto";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Mark a reset token as used. ttlSeconds = remaining token lifetime (max 3600).
export async function consumeResetToken(token: string, ttlSeconds: number): Promise<boolean> {
  const store = getRedis();
  if (!store) return false; // fail open when Redis unavailable (already rate-limited at route level)
  const hash = hashToken(token);
  try {
    // SET NX returns "OK" on first write, null if key exists
    const result = await store.set(`used_reset:${hash}`, "1", { ex: ttlSeconds, nx: true });
    return result === "OK";
  } catch {
    return false; // fail open
  }
}

// Check if a reset token has already been used.
export async function isResetTokenUsed(token: string): Promise<boolean> {
  const store = getRedis();
  if (!store) return false;
  const hash = hashToken(token);
  try {
    const val = await store.get(`used_reset:${hash}`);
    return val === "1";
  } catch {
    return false;
  }
}
