import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { calcScore } from "@/lib/reputation";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const saved = await prisma.savedSwap.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    include: {
      swap: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, lastActiveAt: true } },
        },
      },
    },
  });

  const swapsList = saved.map(s => s.swap).filter(Boolean);
  const userIds = [...new Set(swapsList.map(s => s.userId))];
  const [reps, reviews] = await Promise.all([
    prisma.reputation.findMany({ where: { userId: { in: userIds } } }),
    prisma.review.findMany({ where: { reviewedId: { in: userIds } }, select: { reviewedId: true, rating: true } }),
  ]);
  const repMap = Object.fromEntries(reps.map(r => [r.userId, r]));
  const reviewMap: Record<string, number[]> = {};
  reviews.forEach(r => { (reviewMap[r.reviewedId] ??= []).push(r.rating); });

  const result = swapsList.map(s => ({
    ...s,
    saved: true,
    posterLastActive: s.user?.lastActiveAt ?? null,
    reputation: calcScore({
      completed: repMap[s.userId]?.completed ?? 0,
      cancelled: repMap[s.userId]?.cancelled ?? 0,
      noShow: repMap[s.userId]?.noShow ?? 0,
      reviews: reviewMap[s.userId] ?? [],
    }),
  }));

  return ok(result);
}
