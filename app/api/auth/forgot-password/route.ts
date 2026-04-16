import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { signResetToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { parseBody, BODY_1KB } from "@/lib/parseBody";
import { escapeHtml } from "@/lib/escapeHtml";

// POST /api/auth/forgot-password
// Accepts { email } — sends reset link if account exists. Always returns 200 to prevent enumeration.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!await rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)) {
    Sentry.captureEvent({ message: "Forgot-password rate limit hit", level: "warning", tags: { ip } });
    return err("Too many attempts — try again in 15 minutes", 429);
  }

  // Parse + size-limit before the enumeration-safe try/catch so 413 is returned as-is
  const body = await parseBody(req, BODY_1KB);
  if (body instanceof NextResponse) return body;
  const { email } = body as { email: string };
  if (!email || typeof email !== "string") return err("Email required", 400);

  // Minimum response time prevents timing-based account enumeration
  const minDuration = 400;
  const startedAt = Date.now();

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (user) {
      const token = signResetToken(user.id);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
      const resetLink = `${appUrl}/reset-password/${token}`;

      await sendEmail(
        user.email,
        "Reset your We Move NY password",
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#010028;color:#fff;border-radius:16px">
          <h1 style="font-size:22px;font-weight:800;margin-bottom:8px">Reset your password</h1>
          <p style="color:rgba(255,255,255,.6);font-size:14px;line-height:1.6;margin-bottom:24px">
            Hi ${escapeHtml(user.firstName)}, we received a request to reset your We Move NY password.
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
  } catch { /* non-fatal */ }

  // Pad response to minDuration regardless of whether the email was found/sent
  const elapsed = Date.now() - startedAt;
  if (elapsed < minDuration) await new Promise(r => setTimeout(r, minDuration - elapsed));

  // Always 200 to prevent account enumeration
  return ok({ message: "If that email exists, a reset link has been sent." });
}
