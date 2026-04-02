import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyResetToken } from "@/lib/auth";
import { ok, err } from "@/lib/apiResponse";

// POST /api/auth/reset-password
// Accepts { token, newPassword } — verifies JWT, updates password
export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json();
  if (!token || !newPassword) return err("Token and new password are required", 400);
  if (newPassword.length < 12) return err("Password must be at least 12 characters", 400);

  let userId: string;
  try {
    ({ userId } = verifyResetToken(token));
  } catch {
    return err("Reset link is invalid or has expired", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return err("User not found", 404);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return ok({ message: "Password updated successfully" });
}
