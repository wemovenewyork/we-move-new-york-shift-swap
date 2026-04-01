import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function PUT(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) return err("Both fields required", 400);
  if (newPassword.length < 6) return err("Min 6 characters", 400);

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return err("User not found", 404);

  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) return err("Current password is incorrect", 401);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.userId }, data: { passwordHash } });

  return ok({ message: "Password updated" });
}
