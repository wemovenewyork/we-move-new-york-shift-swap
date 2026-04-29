import { NextRequest, NextResponse } from "next/server";
import { requireUser, checkActive } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { SwapCategory, SwapStatus } from "@prisma/client";
import { calcScore } from "@/lib/reputation";
import { notifyMany } from "@/lib/notifyUser";
import { touchLastActive } from "@/lib/touchLastActive";
import { parseBody, BODY_16KB } from "@/lib/parseBody";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser?.depotId) return err("Set your depot first", 400);
  touchLastActive(user.userId);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const sort = searchParams.get("sort") ?? "newest";
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(Math.max(limitParam, 1), 50);

  // Build where clause
  const andClauses: Record<string, unknown>[] = [{ depotId: dbUser.depotId }];
  if (category && ["work", "daysoff", "vacation", "open_work"].includes(category)) {
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
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: { id: true, firstName: true, lastName: true, lastActiveAt: true } } },
  });

  // Batch-fetch reputation + saved status for current user
  const userIds = [...new Set(swaps.map(s => s.userId))];
  const [reps, reviews, savedSwaps] = await Promise.all([
    prisma.reputation.findMany({ where: { userId: { in: userIds } } }),
    prisma.review.findMany({ where: { reviewedId: { in: userIds } }, select: { reviewedId: true, rating: true } }),
    prisma.savedSwap.findMany({ where: { userId: user.userId, swapId: { in: swaps.map(s => s.id) } }, select: { swapId: true } }),
  ]);

  const savedSet = new Set(savedSwaps.map(s => s.swapId));
  const repMap = Object.fromEntries(reps.map(r => [r.userId, r]));
  const reviewMap: Record<string, number[]> = {};
  reviews.forEach(r => { (reviewMap[r.reviewedId] ??= []).push(r.rating); });

  // Mask poster last name in list responses — show "First L." to limit bulk identity extraction
  const maskLastName = (name: string) => {
    const parts = name.trim().split(" ");
    return parts.length < 2 ? name : `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const swapsWithRep = swaps.map(s => ({
    ...s,
    posterName: s.userId === user.userId ? s.posterName : maskLastName(s.posterName),
    saved: savedSet.has(s.id),
    posterLastActive: s.user?.lastActiveAt ?? null,
    reputation: calcScore({
      completed: repMap[s.userId]?.completed ?? 0,
      cancelled: repMap[s.userId]?.cancelled ?? 0,
      noShow: repMap[s.userId]?.noShow ?? 0,
      reviews: reviewMap[s.userId] ?? [],
    }),
  }));

  const nextCursor = swaps.length < limit ? null : swaps[swaps.length - 1].id;
  return ok({ swaps: swapsWithRep, nextCursor });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const postIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!await rateLimit(`post:ip:${postIp}`, 30, 3_600_000)) return err("Rate limit exceeded — too many posts from this network", 429);
  if (!await rateLimit(`post:${user.userId}`, 5, 3_600_000)) return err("Rate limit: max 5 posts per hour", 429);
  if (!await rateLimit(`post30s:${user.userId}`, 2, 30_000)) return err("Please wait 30 seconds between posts", 429);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { depot: { select: { code: true } } },
  });
  if (!dbUser?.depotId) return err("Set your depot first", 400);
  const activeErr = checkActive(dbUser);
  if (activeErr) return err(activeErr, 403);

  // Dispatchers must be verified before posting
  if (dbUser.role === "dispatcher" && !dbUser.dispatcherVerified) {
    return err("Your dispatcher account is pending verification by an admin", 403);
  }

  const body = await parseBody(req, BODY_16KB);
  if (body instanceof NextResponse) return body;
  const { category, details, contact, date, run, route, startTime, clearTime,
    swingStart, swingEnd, fromDay, fromDate, toDay, toDate, vacationHave, vacationWant } = body as {
    category?: string; details?: string; contact?: string; date?: string; run?: string; route?: string;
    startTime?: string; clearTime?: string; swingStart?: string; swingEnd?: string;
    fromDay?: string; fromDate?: string; toDay?: string; toDate?: string;
    vacationHave?: string; vacationWant?: string;
  };

  if (!category || !details) return err("Category and details are required", 400);
  const validCategories: string[] = ["work", "daysoff", "vacation", "open_work"];
  if (!validCategories.includes(category as string)) return err("Invalid category", 400);
  if (details.length > 500) return err("Details must be 500 characters or fewer", 400);
  // Prevent embedding contact info in free-text — the contact field exists for this
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(details)) return err("Email addresses should go in the contact field, not the swap details", 400);
  if (/\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/.test(details)) return err("Phone numbers should go in the contact field, not the swap details", 400);
  if (contact) {
    if (contact.length > 30) return err("Contact must be 30 characters or fewer", 400);
    // Must look like a phone number or email address
    const isPhone = /^[\d\s\-()+.]{7,20}$/.test(contact.trim());
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
    if (!isPhone && !isEmail) return err("Contact must be a phone number or email address", 400);
  }

  // Validate date fields — must be in the future, no more than 1 year out
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
  if (fromDate && toDate && new Date(toDate as string) < new Date(fromDate as string)) {
    return err("toDate must be on or after fromDate", 400);
  }
  if (run && run.length > 20) return err("Run must be 20 characters or fewer", 400);
  if (route && route.length > 20) return err("Route must be 20 characters or fewer", 400);

  // Only dispatchers can post open work
  if (category === "open_work" && dbUser.role !== "dispatcher") {
    return err("Only verified dispatchers can post open work", 403);
  }
  // Dispatchers can only post open work
  if (dbUser.role === "dispatcher" && category !== "open_work") {
    return err("Dispatchers can only post open work", 403);
  }

  // Normalise details for duplicate check: collapse whitespace and lowercase
  const normalisedDetails = details.trim().replace(/\s+/g, " ").toLowerCase();
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60_000);
  const recentSwaps = await prisma.swap.findMany({
    where: { userId: user.userId, category: category as SwapCategory, createdAt: { gte: thirtyMinutesAgo } },
    select: { details: true },
  });
  const isDupe = recentSwaps.some(s => s.details.trim().replace(/\s+/g, " ").toLowerCase() === normalisedDetails);
  if (isDupe) return err("Duplicate: you already posted this swap recently", 409);

  const posterName = `${dbUser.firstName} ${dbUser.lastName}`;

  const swap = await prisma.swap.create({
    data: {
      userId: user.userId,
      depotId: dbUser.depotId,
      category: category as SwapCategory,
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
  const categoryLabel =
    swap.category === "work" ? "Work"
    : swap.category === "daysoff" ? "Days Off"
    : swap.category === "vacation" ? "Vacation"
    : "Open Work";
  const isOpenWork = swap.category === "open_work";
  await notifyMany(depotUsers.map(u => u.id), {
    title: isOpenWork ? `Open Work posted — ${posterName}` : `New ${categoryLabel} swap posted`,
    body: isOpenWork
      ? `${posterName} (Dispatcher) posted open work that needs coverage`
      : `${posterName} posted a new swap — check the board`,
    url: `/depot/${dbUser.depot!.code}/swaps/${swap.id}`,
  });

  return ok(swap, 201);
}
