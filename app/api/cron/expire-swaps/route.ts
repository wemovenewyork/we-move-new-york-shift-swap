import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser } from "@/lib/notifyUser";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return err("Unauthorized", 401);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch first so we can notify owners
  const toExpire = await prisma.swap.findMany({
    where: { status: "open", date: { lt: today } },
    select: { id: true, userId: true, depotId: true, details: true },
  });

  const result = await prisma.swap.updateMany({
    where: { status: "open", date: { lt: today } },
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

  return ok({ expired: result.count });
}
