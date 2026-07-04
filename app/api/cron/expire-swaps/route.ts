import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser, notifyMany } from "@/lib/notifyUser";
import { nyToday } from "@/lib/nyDate";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return err("Unauthorized", 401);

  try {
  // "Today" in America/New_York as a UTC midnight Date. Swap dates are stored
  // as @db.Date (midnight UTC); a swap dated Apr 30 is "past" only once NY's
  // local date has rolled over to May 1. Single source of truth in lib/nyDate.
  const today = nyToday();

  // Fetch work swaps (have a `date`) that are past, so we can notify owners
  const toExpire = await prisma.swap.findMany({
    where: {
      status: { in: ["open", "pending"] },
      date: { lt: today, not: null },
    },
    select: { id: true, userId: true, depotId: true, details: true },
  });

  // Mark work swaps as expired: open/pending swaps whose date is in the past
  const result = await prisma.swap.updateMany({
    where: {
      status: { in: ["open", "pending"] },
      date: { lt: today, not: null },
    },
    data: { status: "expired" },
  });

  // Also expire daysoff swaps where fromDate is in the past
  const result2 = await prisma.swap.updateMany({
    where: {
      status: { in: ["open", "pending"] },
      fromDate: { lt: today, not: null },
      date: null,
    },
    data: { status: "expired" },
  });

  // A8: an expired swap can't be accepted anymore — decline its pending
  // proposals so they don't linger in proposers' views, and tell them.
  const orphanedProposals = await prisma.swapAgreement.findMany({
    where: { status: "pending", swap: { status: "expired" } },
    select: { id: true, userAId: true },
  });
  if (orphanedProposals.length > 0) {
    await prisma.swapAgreement.updateMany({
      where: { id: { in: orphanedProposals.map((p) => p.id) }, status: "pending" },
      data: { status: "declined" },
    });
    await notifyMany([...new Set(orphanedProposals.map((p) => p.userAId))], {
      title: "Swap expired before a decision",
      body: "A swap you proposed on expired — no effect on your reputation. Check the board for fresh swaps.",
      url: "/depots",
    });
  }

  // Notify each owner — awaited so serverless doesn't kill before DB write
  for (const swap of toExpire) {
    await notifyUser(swap.userId, {
      title: "Your swap expired",
      body: `"${swap.details.substring(0, 60)}" — repost it to keep looking`,
      url: `/depot/${swap.depotId}/my`,
    });
  }

  return ok({ expired: result.count + result2.count, proposalsDeclined: orphanedProposals.length });
  } catch (e) {
    return err(`Cron failed: ${e instanceof Error ? e.message : "unknown error"}`, 500);
  }
}
