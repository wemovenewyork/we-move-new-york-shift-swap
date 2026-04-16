import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { clientIp } from "@/lib/rateLimit";
import { Redis } from "@upstash/redis";

export async function GET(req: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return err("Database unreachable", 503);
  }

  const ip = clientIp(req);

  // Directly test Redis read/write to diagnose rate-limit issues
  let redisStatus = "unconfigured";
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      redisStatus = "env_missing";
    } else {
      const redis = new Redis({ url, token });
      await redis.set("health:ping", "1", { ex: 10 });
      const val = await redis.get("health:ping");
      redisStatus = val === "1" ? "ok" : "read_mismatch";
    }
  } catch (e) {
    redisStatus = `error:${e instanceof Error ? e.message : String(e)}`;
  }

  return ok({ status: "ok", ip, redisStatus });
}
