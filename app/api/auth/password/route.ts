import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import { parseBody, BODY_2KB } from "@/lib/parseBody";

export async function PUT(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  if (!await rateLimit(`change-password:${user.userId}`, 5, 15 * 60 * 1000)) {
    Sentry.captureEvent({ message: "Change-password rate limit hit", level: "warning", extra: { userId: user.userId } });
    return err("Too many attempts — try again in 15 minutes", 429);
  }

  const body = await parseBody(req, BODY_2KB);
  if (body instanceof NextResponse) return body;
  const { currentPassword, newPassword } = body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword) return err("Both fields required", 400);
  if (newPassword.length < 12) return err("Password must be at least 12 characters", 400);
  if (newPassword.length > 128) return err("Password must be 128 characters or fewer", 400);
  if (currentPassword.length > 128) return err("Password too long", 400);

  // Reject passwords that are purely numeric or common patterns
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialOrMixed = /[^a-zA-Z0-9]/.test(newPassword) || (hasLetter && hasNumber);
  if (!hasSpecialOrMixed) return err("Password must contain letters and numbers", 400);

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return err("User not found", 404);

  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) return err("Current password is incorrect", 401);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.userId }, data: { passwordHash } });

  return ok({ message: "Password updated" });
}
