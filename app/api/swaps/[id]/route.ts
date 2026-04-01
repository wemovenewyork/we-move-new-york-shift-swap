import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/reputation";
import { ok, err } from "@/lib/apiResponse";

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

  const body = await req.json();
  const { details, contact, date, run, route, startTime, clearTime,
    swingStart, swingEnd, fromDay, fromDate, toDay, toDate, vacationHave, vacationWant } = body;

  if (details && details.length > 500) return err("Details max 500 chars", 400);

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
