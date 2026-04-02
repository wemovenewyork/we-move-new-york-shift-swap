import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!await rateLimit(`login:${ip}`, 10, 60_000)) return err("Too many attempts — try again in a minute", 429);

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
