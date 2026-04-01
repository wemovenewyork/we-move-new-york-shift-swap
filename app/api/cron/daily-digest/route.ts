import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/pushNotify";
import { ok, err } from "@/lib/apiResponse";

// Runs every morning at 7 AM — sends each subscribed operator a summary of
// new open swaps posted in their depot in the last 24 hours.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return err("Unauthorized", 401);

  const since = new Date(Date.now() - 86_400_000);

  // Group new swaps by depotId
  const newSwaps = await prisma.swap.findMany({
    where: { status: "open", createdAt: { gte: since } },
    select: { depotId: true, category: true },
  });

  const countsByDepot = new Map<string, number>();
  for (const s of newSwaps) {
    countsByDepot.set(s.depotId, (countsByDepot.get(s.depotId) ?? 0) + 1);
  }

  if (countsByDepot.size === 0) return ok({ sent: 0, message: "No new swaps" });

  // Get all push subscriptions for users in affected depots
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { depotId: { in: Array.from(countsByDepot.keys()) } } },
    include: { user: { select: { depotId: true, firstName: true } } },
  });

  let sent = 0;
  const failed: string[] = [];

  for (const sub of subscriptions) {
    const depotId = sub.user.depotId;
    if (!depotId) continue;
    const count = countsByDepot.get(depotId) ?? 0;
    if (count === 0) continue;

    const success = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        title: "We Move NY — Daily Digest",
        body: `${count} new swap${count === 1 ? "" : "s"} posted at your depot today.`,
        url: "/depots",
      }
    );

    if (success) {
      sent++;
    } else {
      failed.push(sub.id);
    }
  }

  // Clean up dead subscriptions (delivery failed)
  if (failed.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: failed } } });
  }

  return ok({ sent, cleaned: failed.length });
}
