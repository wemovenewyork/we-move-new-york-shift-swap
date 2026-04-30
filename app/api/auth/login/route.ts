import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { err } from "@/lib/apiResponse";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { parseBody, BODY_1KB } from "@/lib/parseBody";
import { writeAuditLog } from "@/lib/audit";

const MAX_ATTEMPTS = 10;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!await rateLimit(`login:${ip}`, 10, 60_000)) {
      Sentry.captureEvent({
        message: "Login rate limit hit",
        level: "warning",
        tags: { ip },
      });
      return err("Too many attempts — try again in a minute", 429);
    }

    const body = await parseBody(req, BODY_1KB);
    if (body instanceof NextResponse) return body;
    const { email, password } = body as { email: string; password: string };
    if (!email || !password) return err("Email and password required", 400);
    if (password.length > 128) return err("Password too long", 400);

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
      writeAuditLog({
        adminId: user.id,
        action: "login_failed",
        targetId: user.id,
        targetType: "user",
        detail: `Failed login attempt (${attempts}/${MAX_ATTEMPTS})${locked ? " — account locked" : ""}`,
        ip,
      });
      if (locked) {
        Sentry.captureEvent({
          message: "Account locked after repeated failed logins",
          level: "warning",
          tags: { ip },
          extra: { email: user.email, userId: user.id },
        });
        return err("Account locked — too many failed attempts. Try again in 15 minutes.", 423);
      }
      return err("Invalid email or password", 401);
    }

    // Successful login — reset lockout counters
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    // Soft launch gate — only allow the designated depot (admins bypass)
    const softLaunchDepot = process.env.SOFT_LAUNCH_DEPOT;
    if (
      softLaunchDepot &&
      !["admin", "subAdmin"].includes(user.role) &&
      user.depotId &&
      user.depot?.code !== softLaunchDepot
    ) {
      return err(`We Move New York is currently in soft launch at Queens Village only. We'll be at your depot soon!`, 403);
    }

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
