import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser } from "@/lib/notifyUser";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return err("Unauthorized", 401);

  try {
  const now = new Date();

  // Fetch work swaps (have a `date`) that are past, so we can notify owners
  const toExpire = await prisma.swap.findMany({
    where: {
      status: { in: ["open", "pending"] },
      date: { lt: now, not: null },
    },
    select: { id: true, userId: true, depotId: true, details: true },
  });

  // Mark work swaps as expired: open/pending swaps whose date is in the past
  const result = await prisma.swap.updateMany({
    where: {
      status: { in: ["open", "pending"] },
      date: { lt: now, not: null },
    },
    data: { status: "expired" },
  });

  // Also expire daysoff swaps where fromDate is in the past
  const result2 = await prisma.swap.updateMany({
    where: {
      status: { in: ["open", "pending"] },
      fromDate: { lt: now, not: null },
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
