import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser } from "@/lib/notifyUser";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return err("Unauthorized", 401);

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

  // Notify each owner — fire and forget
  for (const swap of toExpire) {
    notifyUser(swap.userId, {
      title: "Your swap expired",
      body: `"${swap.details.substring(0, 60)}" — repost it to keep looking`,
      url: `/depot/${swap.depotId}/my`,
    });
  }

  return ok({ expired: result.count + result2.count });
}
