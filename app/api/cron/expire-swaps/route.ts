import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser } from "@/lib/notifyUser";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return err("Unauthorized", 401);

  try {
  // Compute "today" in America/New_York as a UTC midnight Date.
  // Swap dates are stored as @db.Date (midnight UTC). A swap dated Apr 30 should
  // be considered "in the past" only after Apr 30 has fully ended in NY — i.e.
  // when NY's local date has rolled over to May 1.
  const nyParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // e.g. "2026-04-30"
  const nyToday = new Date(`${nyParts}T00:00:00Z`);

  // Fetch work swaps (have a `date`) that are past, so we can notify owners
  const toExpire = await prisma.swap.findMany({
    where: {
      status: { in: ["open", "pending"] },
      date: { lt: nyToday, not: null },
    },
    select: { id: true, userId: true, depotId: true, details: true },
  });

  // Mark work swaps as expired: open/pending swaps whose date is in the past
  const result = await prisma.swap.updateMany({
    where: {
      status: { in: ["open", "pending"] },
      date: { lt: nyToday, not: null },
    },
    data: { status: "expired" },
  });

  // Also expire daysoff swaps where fromDate is in the past
  const result2 = await prisma.swap.updateMany({
    where: {
      status: { in: ["open", "pending"] },
      fromDate: { lt: nyToday, not: null },
      date: null,
    },
    data: { status: "expired" },
  });

  // Notify each owner — awaited so serverless doesn't kill before DB write
  for (const swap of toExpire) {
    await notifyUser(swap.userId, {
      title: "Your swap expired",
      body: `"${swap.details.substring(0, 60)}" — repost it to keep looking`,
      url: `/depot/${swap.depotId}/my`,
    });
  }

  return ok({ expired: result.count + result2.count });
  } catch (e) {
    return err(`Cron failed: ${e instanceof Error ? e.message : "unknown error"}`, 500);
  }
}
