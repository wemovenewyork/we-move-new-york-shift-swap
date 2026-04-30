import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { parseBody, BODY_2KB } from "@/lib/parseBody";

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

  return ok({ message: "Reported. Thank you." }, 201);
}
