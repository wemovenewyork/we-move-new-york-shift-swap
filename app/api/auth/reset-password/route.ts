import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { verifyResetToken } from "@/lib/auth";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { parseBody, BODY_2KB } from "@/lib/parseBody";
import { consumeResetToken, isResetTokenUsed } from "@/lib/resetTokenBlocklist";
import { blockUserAccessTokens } from "@/lib/tokenBlocklist";
import jwt from "jsonwebtoken";

// POST /api/auth/reset-password
// Accepts { token, newPassword } — verifies JWT, updates password
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!await rateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000)) {
    Sentry.captureEvent({ message: "Reset-password rate limit hit", level: "warning", tags: { ip } });
    return err("Too many attempts — try again in 15 minutes", 429);
  }

  const body = await parseBody(req, BODY_2KB);
  if (body instanceof NextResponse) return body;
  const { token, newPassword } = body as { token: string; newPassword: string };
  if (!token || !newPassword) return err("Token and new password are required", 400);
  if (newPassword.length < 12) return err("Password must be at least 12 characters", 400);
  if (newPassword.length > 128) return err("Password must be 128 characters or fewer", 400);

  // Match registration complexity check — letters+numbers OR special chars
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialOrMixed = /[^a-zA-Z0-9]/.test(newPassword) || (hasLetter && hasNumber);
  if (!hasSpecialOrMixed) return err("Password must contain letters and numbers", 400);

  // Check single-use before verifying — avoids leaking validity info
  if (await isResetTokenUsed(token)) return err("Reset link has already been used", 400);

  let userId: string;
  let tokenExp: number;
  try {
    ({ userId } = verifyResetToken(token));
    const decoded = jwt.decode(token) as { exp?: number } | null;
    tokenExp = decoded?.exp ?? Math.floor(Date.now() / 1000) + 3600;
  } catch {
    return err("Reset link is invalid or has expired", 400);
  }

  // Atomically mark token as used — reject if another request consumed it first
  const ttlSeconds = Math.max(1, tokenExp - Math.floor(Date.now() / 1000));
  const consumed = await consumeResetToken(token, ttlSeconds);
  if (!consumed) return err("Reset link has already been used", 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return err("User not found", 404);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Invalidate all existing sessions — user reset password because they
  // suspect their account was compromised. Force-logout cuts off any
  // stolen access tokens (15min remaining lifetime). The next refresh
  // attempt by an attacker will fail because we just bumped the password.
  await blockUserAccessTokens(userId);

  return ok({ message: "Password updated successfully" });
}
