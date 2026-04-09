import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { err } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";

const MAX_ATTEMPTS = 10;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    if (!await rateLimit(`login:${ip}`, 10, 60_000)) return err("Too many attempts — try again in a minute", 429);

    const { email, password } = await req.json();
    if (!email || !password) return err("Email and password required", 400);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { depot: true } });
    if (!user) return err("Invalid email or password", 401);

    // Check email verification
    if (!user.verified) return err("Please verify your email before signing in. Check your inbox.", 403);

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      return err(`Account locked — too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`, 423);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      const attempts = user.loginAttempts + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: attempts,
          ...(locked ? { lockedUntil: new Date(Date.now() + LOCKOUT_MS) } : {}),
        },
      });
      if (locked) return err("Account locked — too many failed attempts. Try again in 15 minutes.", 423);
      return err("Invalid email or password", 401);
    }

    // Successful login — reset lockout counters
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    const payload = { userId: user.id, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const res = NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        depotId: user.depotId,
        depot: user.depot,
        role: user.role,
        language: user.language,
        termsVersion: user.termsVersion,
      },
    });

    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/",
      maxAge: 900, // 15 minutes
    });
    res.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 604800, // 7 days
    });

    return res;
  } catch (e: unknown) {
    console.error("[login] unexpected error:", e);
    return err("An unexpected error occurred. Please try again.", 500);
  }
}
