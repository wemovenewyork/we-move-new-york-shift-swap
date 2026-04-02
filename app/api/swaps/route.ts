import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { SwapCategory, SwapStatus } from "@prisma/client";
import { calcScore } from "@/lib/reputation";
import { notifyMany } from "@/lib/notifyUser";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser?.depotId) return err("Set your depot first", 400);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const sort = searchParams.get("sort") ?? "newest";

  // Build where clause
  const andClauses: Record<string, unknown>[] = [{ depotId: dbUser.depotId }];
  if (category && ["work", "daysoff", "vacation"].includes(category)) {
    andClauses.push({ category: category as SwapCategory });
  }
  if (status && ["open", "pending", "filled", "expired"].includes(status)) {
    andClauses.push({ status: status as SwapStatus });
  }
  if (search) {
    andClauses.push({ OR: [
      { posterName: { contains: search, mode: "insensitive" } },
      { details: { contains: search, mode: "insensitive" } },
      { route: { contains: search, mode: "insensitive" } },
      { run: { contains: search, mode: "insensitive" } },
    ]});
  }
  if (dateFrom || dateTo) {
    const dateCond: { gte?: Date; lte?: Date } = {};
    if (dateFrom) dateCond.gte = new Date(dateFrom);
    if (dateTo) dateCond.lte = new Date(dateTo);
    andClauses.push({ date: dateCond });
  }

  const orderBy =
    sort === "oldest" ? { createdAt: "asc" as const }
    : sort === "date" ? { date: "asc" as const }
    : { createdAt: "desc" as const };

  const swaps = await prisma.swap.findMany({
    where: { AND: andClauses },
    orderBy,
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  // Batch-fetch reputation for all unique poster users
  const userIds = [...new Set(swaps.map(s => s.userId))];
  const [reps, reviews] = await Promise.all([
    prisma.reputation.findMany({ where: { userId: { in: userIds } } }),
    prisma.review.findMany({ where: { reviewedId: { in: userIds } }, select: { reviewedId: true, rating: true } }),
  ]);

  const repMap = Object.fromEntries(reps.map(r => [r.userId, r]));
  const reviewMap: Record<string, number[]> = {};
  reviews.forEach(r => { (reviewMap[r.reviewedId] ??= []).push(r.rating); });

  const swapsWithRep = swaps.map(s => ({
    ...s,
    reputation: calcScore({
      completed: repMap[s.userId]?.completed ?? 0,
      cancelled: repMap[s.userId]?.cancelled ?? 0,
      noShow: repMap[s.userId]?.noShow ?? 0,
      reviews: reviewMap[s.userId] ?? [],
    }),
  }));

  return ok(swapsWithRep);
}

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  if (!await rateLimit(`post:${user.userId}`, 5, 3_600_000)) return err("Rate limit: max 5 posts per hour", 429);
  if (!await rateLimit(`post30s:${user.userId}`, 2, 30_000)) return err("Please wait 30 seconds between posts", 429);

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser?.depotId) return err("Set your depot first", 400);

  const body = await req.json();
  const { category, details, contact, date, run, route, startTime, clearTime,
    swingStart, swingEnd, fromDay, fromDate, toDay, toDate, vacationHave, vacationWant } = body;

  if (!category || !details) return err("Category and details are required", 400);
  if (details.length > 500) return err("Details must be 500 characters or fewer", 400);

  const fiveMinutesAgo = new Date(Date.now() - 300_000);
  const dupe = await prisma.swap.findFirst({
    where: { userId: user.userId, details, createdAt: { gte: fiveMinutesAgo } },
  });
  if (dupe) return err("Duplicate: you already posted this swap recently", 409);

  const posterName = `${dbUser.firstName} ${dbUser.lastName}`;

  const swap = await prisma.swap.create({
    data: {
      userId: user.userId,
      depotId: dbUser.depotId,
      category,
      details,
      contact: contact ?? null,
      posterName,
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

  // Notify all other users at this depot who have push subscriptions
  const depotUsers = await prisma.user.findMany({
    where: { depotId: dbUser.depotId, id: { not: user.userId }, pushSubscriptions: { some: {} } },
    select: { id: true },
  });
  const categoryLabel = swap.category === "work" ? "Work" : swap.category === "daysoff" ? "Days Off" : "Vacation";
  notifyMany(depotUsers.map(u => u.id), {
    title: `New ${categoryLabel} swap posted`,
    body: `${posterName} posted a new swap — check the board`,
    url: `/depot/${dbUser.depotId}/swaps/${swap.id}`,
  });

  return ok(swap, 201);
}
