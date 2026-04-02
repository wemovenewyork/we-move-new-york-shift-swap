import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { genInviteCode } from "@/lib/inviteCode";
import { ok, err } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, password, inviteCode, depotId } = await req.json();

  if (!firstName || !lastName || !email || !password || !inviteCode || !depotId) {
    return err("All fields are required", 400);
  }
  if (!email.includes("@")) return err("Invalid email", 400);
  if (password.length < 12) return err("Password must be at least 12 characters", 400);

  const codeUpper = inviteCode.trim().toUpperCase();
  const invite = await prisma.inviteCode.findUnique({ where: { code: codeUpper } });
  if (!invite || !invite.isValid) return err("Invalid invite code", 400);

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return err("Email already registered", 409);

  // Validate depot
  const depot = await prisma.depot.findUnique({ where: { id: depotId } });
  if (!depot) return err("Invalid depot selected", 400);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      depotId: depot.id,
      verified: true,
      invitedBy: invite.createdBy,
    },
  });

  // Consume invite code
  await prisma.inviteCode.update({
    where: { code: codeUpper },
    data: { isValid: false, usedBy: user.id },
  });

  // Generate 3 new invite codes for new user
  const newCodes: string[] = [];
  for (let i = 0; i < 3; i++) {
    let code = genInviteCode();
    // Retry on collision
    while (await prisma.inviteCode.findUnique({ where: { code } })) {
      code = genInviteCode();
    }
    await prisma.inviteCode.create({ data: { code, createdBy: user.id } });
    newCodes.push(code);
  }

  // Initialize reputation
  await prisma.reputation.create({ data: { userId: user.id } });

  const payload = { userId: user.id, email: user.email };
  return ok({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      depotId: user.depotId,
      role: user.role,
      language: user.language,
    },
    inviteCodes: newCodes,
  }, 201);
}
