import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/reputation";
import { ok, err } from "@/lib/apiResponse";
import { parseBody, BODY_16KB } from "@/lib/parseBody";

async function getSwapWithRep(id: string) {
  const swap = await prisma.swap.findUnique({
    where: { id },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!swap) return null;

  const rep = await prisma.reputation.findUnique({ where: { userId: swap.userId } });
  const reviews = await prisma.review.findMany({
    where: { reviewedId: swap.userId },
    select: { rating: true },
  });
  const repScore = calcScore({
    completed: rep?.completed ?? 0,
    cancelled: rep?.cancelled ?? 0,
    noShow: rep?.noShow ?? 0,
    reviews: reviews.map((r) => r.rating),
  });

  return { ...swap, reputation: repScore };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;

  const swap = await getSwapWithRep(id);
  if (!swap) return err("Swap not found", 404);

  // Depot scoping
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (swap.depotId !== dbUser?.depotId) return err("Not authorized", 403);

  return ok(swap);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) return err("Swap not found", 404);
  if (swap.userId !== user.userId) return err("Not authorized", 403);

  const body = await parseBody(req, BODY_16KB);
  if (body instanceof NextResponse) return body;
  const { details, contact, date, run, route, startTime, clearTime,
    swingStart, swingEnd, fromDay, fromDate, toDay, toDate, vacationHave, vacationWant } = body as {
    details?: string; contact?: string; date?: string; run?: string; route?: string;
    startTime?: string; clearTime?: string; swingStart?: string; swingEnd?: string;
    fromDay?: string; fromDate?: string; toDay?: string; toDate?: string;
    vacationHave?: string; vacationWant?: string;
  };

  if (details && details.length > 500) return err("Details max 500 chars", 400);

  const now = new Date();
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  for (const [field, val] of [["date", date], ["fromDate", fromDate], ["toDate", toDate]] as [string, unknown][]) {
    if (val) {
      const d = new Date(val as string);
      if (isNaN(d.getTime())) return err(`Invalid ${field}`, 400);
      if (d < now) return err(`${field} must be in the future`, 400);
      if (d > oneYearFromNow) return err(`${field} cannot be more than 1 year from now`, 400);
    }
  }
  if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) {
    return err("toDate must be on or after fromDate", 400);
  }

  const updated = await prisma.swap.update({
    where: { id },
    data: {
      ...(details && { details }),
      contact: contact ?? null,
      date: date ? new Date(date) : null,
      run: run ?? null,
      route: route ?? null,
      startTime: startTime ?? null,
      clearTime: clearTime ?? null,
      swingStart: swingStart ?? null,
      swingEnd: swingEnd ?? null,
      fromDay: fromDay ?? null,
      fromDate: fromDate ? new Date(fromDate) : null,
      toDay: toDay ?? null,
      toDate: toDate ? new Date(toDate) : null,
      vacationHave: vacationHave ?? null,
      vacationWant: vacationWant ?? null,
    },
  });

  return ok(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) return err("Swap not found", 404);
  if (swap.userId !== user.userId) return err("Not authorized", 403);

  await prisma.swap.delete({ where: { id } });
  return ok({ message: "Deleted" });
}
