import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signResetToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/auth/forgot-password
// Accepts { email } — sends reset link if account exists. Always returns 200 to prevent enumeration.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(`forgot:${ip}`, 5, 60_000)) return err("Too many attempts — try again in a minute", 429);

  const { email } = await req.json();
  if (!email || typeof email !== "string") return err("Email required", 400);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (user) {
    const token = signResetToken(user.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wemoveny.app";
    const resetLink = `${appUrl}/reset-password/${token}`;

    await sendEmail(
      user.email,
      "Reset your We Move NY password",
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#010028;color:#fff;border-radius:16px">
        <h1 style="font-size:22px;font-weight:800;margin-bottom:8px">Reset your password</h1>
        <p style="color:rgba(255,255,255,.6);font-size:14px;line-height:1.6;margin-bottom:24px">
          Hi ${user.firstName}, we received a request to reset your We Move NY password.
          This link expires in 1 hour.
        </p>
        <a href="${resetLink}" style="display:inline-block;padding:14px 28px;border-radius:12px;background:#D1AD38;color:#010028;font-weight:700;font-size:15px;text-decoration:none">
          Reset Password
        </a>
        <p style="color:rgba(255,255,255,.4);font-size:12px;margin-top:24px">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>`
    ).catch(() => {}); // fire-and-forget; log silently if email fails
  }

  // Always 200 to prevent account enumeration
  return ok({ message: "If that email exists, a reset link has been sent." });
}
