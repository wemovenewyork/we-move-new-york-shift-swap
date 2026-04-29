import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { blockUserAccessTokens } from "@/lib/tokenBlocklist";

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  await Promise.all([
    // Bump updatedAt to invalidate all refresh tokens at next rotation
    prisma.user.update({ where: { id: user.userId }, data: { updatedAt: new Date() } }),
    // Mark all current access tokens as invalid in Redis (15-min TTL = token lifetime)
    blockUserAccessTokens(user.userId),
  ]);

  return ok({ success: true });
}
