import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  // Invalidate all refresh tokens for this user by bumping updatedAt,
  // which can be checked at token refresh time to reject stale tokens.
  await prisma.user.update({
    where: { id: user.userId },
    data: { updatedAt: new Date() },
  });
  return ok({ success: true });
}
