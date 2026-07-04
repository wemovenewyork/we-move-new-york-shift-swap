import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { parseBody, BODY_2KB } from "@/lib/parseBody";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/escapeHtml";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  // Rate limit reports — prevent flooding the admin queue with bogus reports.
  // Per-IP cap protects against many compromised accounts on the same network.
  const ip = clientIp(req);
  if (!await rateLimit(`report:ip:${ip}`, 30, 3_600_000)) return err("Rate limit exceeded — too many reports from this network", 429);
  if (!await rateLimit(`report:${user.userId}`, 10, 3_600_000)) return err("Rate limit: max 10 reports per hour", 429);

  const { id } = await params;
  const body = await parseBody(req, BODY_2KB);
  if (body instanceof NextResponse) return body;
  const { reason } = body as { reason?: string };
  if (reason && reason.length > 500) return err("Reason must be 500 characters or fewer", 400);

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) return err("Swap not found", 404);

  const existing = await prisma.report.findFirst({
    where: { swapId: id, reporterId: user.userId },
  });
  if (existing) return err("Already reported", 409);

  await prisma.report.create({
    data: { swapId: id, reporterId: user.userId, reason: reason ?? null },
  });

  // M10: alert the admin queue so a fresh report is actioned, not just parked
  // in the dashboard. Non-fatal — the report is already persisted, so a mail
  // failure must not surface to the reporter (or lose their report on retry).
  const alertTo = process.env.ADMIN_ALERT_EMAIL ?? process.env.EMAIL_REPLY_TO;
  if (alertTo) {
    try {
      const reporter = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { firstName: true, lastName: true },
      });
      const reporterName = reporter
        ? `${reporter.firstName} ${reporter.lastName}`
        : user.userId;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const reasonHtml = reason?.trim()
        ? escapeHtml(reason.trim())
        : "<em>(no reason given)</em>";
      const emailHtml = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#010028;color:#fff;border-radius:16px">
  <h2 style="font-size:18px;font-weight:800;margin-bottom:8px">New swap report</h2>
  <p style="color:rgba(255,255,255,.6);font-size:14px;line-height:1.6;margin-bottom:8px"><strong>Reporter:</strong> ${escapeHtml(reporterName)}</p>
  <p style="color:rgba(255,255,255,.6);font-size:14px;line-height:1.6;margin-bottom:8px"><strong>Swap ID:</strong> ${escapeHtml(id)}</p>
  <p style="color:rgba(255,255,255,.6);font-size:14px;line-height:1.6;margin-bottom:24px"><strong>Reason:</strong> ${reasonHtml}</p>
  <a href="${appUrl}/admin" style="display:inline-block;padding:14px 28px;border-radius:12px;background:#D1AD38;color:#010028;font-weight:700;font-size:15px;text-decoration:none">Review in admin</a>
</div>`;
      await sendEmail(alertTo, "New swap report — action needed", emailHtml);
    } catch (e) {
      Sentry.captureException(e, {
        level: "warning",
        tags: { source: "report-admin-alert" },
        extra: { swapId: id },
      });
    }
  }

  return ok({ message: "Reported. Thank you." }, 201);
}
