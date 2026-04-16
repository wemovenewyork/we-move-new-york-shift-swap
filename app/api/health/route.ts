import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ip = clientIp(req);
    const rateLimitOk = await rateLimit(`health:${ip}`, 100, 60_000);
    return ok({ status: "ok", ip, rateLimitOk, redisWorking: rateLimitOk !== undefined });
  } catch {
    return err("Database unreachable", 503);
  }
}
