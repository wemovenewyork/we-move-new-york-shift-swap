import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { genInviteCode } from "@/lib/inviteCode";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!await rateLimit(`register:${ip}`, 5, 3_600_000)) return err("Too many registration attempts — try again in an hour", 429);

  const { firstName, lastName, email, password, inviteCode, depotId } = await req.json();

  if (!firstName || !lastName || !email || !password || !inviteCode || !depotId) {
    return err("All fields are required", 400);
  }
  if (!email.includes("@")) return err("Invalid email", 400);
  if (password.length < 12) return err("Password must be at least 12 characters", 400);

  // Reject passwords that are purely numeric or common patterns
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialOrMixed = /[^a-zA-Z0-9]/.test(password) || (hasLetter && hasNumber);
  if (!hasSpecialOrMixed) return err("Password must contain letters and numbers", 400);

  const codeUpper = inviteCode.trim().toUpperCase();
  const invite = await prisma.inviteCode.findUnique({ where: { code: codeUpper } });
  if (!invite || !invite.isValid) return err("Invalid invite code", 400);

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return err("Email already registered", 409);

  // Validate depot
  const depot = await prisma.depot.findUnique({ where: { id: depotId } });
  if (!depot) return err("Invalid depot selected", 400);

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      depotId: depot.id,
      verified: true, // TODO: set to false once Resend domain is verified
      emailVerifyToken: verifyToken,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
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

  // Send verification email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://we-move-ny-shift-swap.vercel.app";
  const verifyLink = `${appUrl}/verify-email/${verifyToken}`;
  sendEmail(
    user.email,
    "Verify your We Move NY email",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#010028;color:#fff;border-radius:16px">
      <h1 style="font-size:22px;font-weight:800;margin-bottom:8px">Verify your email</h1>
      <p style="color:rgba(255,255,255,.6);font-size:14px;line-height:1.6;margin-bottom:24px">
        Hi ${user.firstName}, thanks for joining We Move NY! Please verify your email address to activate your account.
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
    emailVerificationRequired: true,
  }, 201);
}
