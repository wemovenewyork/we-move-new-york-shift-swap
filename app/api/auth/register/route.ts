import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { genInviteCode } from "@/lib/inviteCode";
import { err } from "@/lib/apiResponse";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { parseBody, BODY_4KB } from "@/lib/parseBody";
import { sendEmail } from "@/lib/email";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!await rateLimit(`register:${ip}`, 5, 3_600_000)) {
    Sentry.captureEvent({ message: "Register rate limit hit", level: "warning", tags: { ip } });
    return err("Too many registration attempts — try again in an hour", 429);
  }

  const body = await parseBody(req, BODY_4KB);
  if (body instanceof NextResponse) return body;
  const { firstName, lastName, email, password, inviteCode, role: requestedRole, dispatcherBadge } = body as {
    firstName: string; lastName: string; email: string; password: string;
    inviteCode?: string; role?: string; dispatcherBadge?: string;
  };

  const isDispatcher = requestedRole === "dispatcher";

  if (!firstName || !lastName || !email || !password) {
    return err("All fields are required", 400);
  }
  if (!isDispatcher && !inviteCode) return err("Invite code is required", 400);
  if (!email.includes("@")) return err("Invalid email", 400);
  if (firstName.trim().length > 50) return err("First name must be 50 characters or fewer", 400);
  if (lastName.trim().length > 50) return err("Last name must be 50 characters or fewer", 400);
  if (inviteCode && inviteCode.length > 20) return err("Invalid invite code", 400);
  if (dispatcherBadge && dispatcherBadge.length > 50) return err("Badge number must be 50 characters or fewer", 400);
  if (password.length < 12) return err("Password must be at least 12 characters", 400);
  if (password.length > 128) return err("Password must be 128 characters or fewer", 400);

  // Reject passwords that are purely numeric or common patterns
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialOrMixed = /[^a-zA-Z0-9]/.test(password) || (hasLetter && hasNumber);
  if (!hasSpecialOrMixed) return err("Password must contain letters and numbers", 400);

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return err("Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = crypto.randomBytes(32).toString("hex");

  let newCodes: string[] = [];
  let user;

  if (!isDispatcher) {
    const codeUpper = (inviteCode as string).trim().toUpperCase();

    try {
      user = await prisma.$transaction(async (tx) => {
        // Atomically claim the invite code — prevents race conditions where two
        // simultaneous registrations consume the same code
        const claimed = await tx.inviteCode.updateMany({
          where: { code: codeUpper, isValid: true },
          data: { isValid: false },
        });
        if (claimed.count === 0) throw new Error("INVALID_INVITE");

        const invite = await tx.inviteCode.findUnique({
          where: { code: codeUpper },
          select: { createdBy: true },
        });

        const newUser = await tx.user.create({
          data: {
            email: email.toLowerCase().trim(),
            passwordHash,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            role: "operator",
            verified: true,
            emailVerifyToken: verifyToken,
            emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            ...(invite?.createdBy ? { invitedBy: invite.createdBy } : {}),
          },
        });

        await tx.inviteCode.updateMany({
          where: { code: codeUpper },
          data: { usedBy: newUser.id },
        });

        return newUser;
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "INVALID_INVITE") {
        return err("Invalid invite code", 400);
      }
      throw e;
    }

    // Generate 3 new invite codes for new operator (outside transaction — non-critical)
    for (let i = 0; i < 3; i++) {
      let code = genInviteCode();
      while (await prisma.inviteCode.findUnique({ where: { code } })) {
        code = genInviteCode();
      }
      await prisma.inviteCode.create({ data: { code, createdBy: user.id } });
      newCodes.push(code);
    }

    // Initialize reputation
    await prisma.reputation.create({ data: { userId: user.id } });
  } else {
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: "dispatcher",
        dispatcherBadge: dispatcherBadge ? dispatcherBadge.trim() : null,
        verified: true,
        emailVerifyToken: verifyToken,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  // Send verification email — HTML-escape user-supplied name fields
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  const verifyLink = `${appUrl}/verify-email/${verifyToken}`;
  const safeFirstName = escapeHtml(user.firstName);
  sendEmail(
    user.email,
    "Verify your We Move NY email",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#010028;color:#fff;border-radius:16px">
      <h1 style="font-size:22px;font-weight:800;margin-bottom:8px">Verify your email</h1>
      <p style="color:rgba(255,255,255,.6);font-size:14px;line-height:1.6;margin-bottom:24px">
        Hi ${safeFirstName}, thanks for joining We Move NY! Please verify your email address to activate your account.
        This link expires in 24 hours.
      </p>
      <a href="${verifyLink}" style="display:inline-block;padding:14px 28px;border-radius:12px;background:#D1AD38;color:#010028;font-weight:700;font-size:15px;text-decoration:none">
        Verify Email
      </a>
      <p style="color:rgba(255,255,255,.4);font-size:12px;margin-top:24px">
        If you didn't create a We Move NY account, you can safely ignore this email.
      </p>
    </div>`
  ).catch(() => {});

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
      role: user.role,
      language: user.language,
      dispatcherVerified: user.dispatcherVerified,
    },
    ...(newCodes.length > 0 ? { inviteCodes: newCodes } : {}),
    emailVerificationRequired: true,
    ...(isDispatcher ? { pendingVerification: true } : {}),
  }, { status: 201 });

  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: 900,
  });
  res.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 604800,
  });

  return res;
}
