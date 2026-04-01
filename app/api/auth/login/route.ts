import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { ok, err } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return err("Email and password required", 400);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return err("Invalid email or password", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return err("Invalid email or password", 401);

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
  });
}
