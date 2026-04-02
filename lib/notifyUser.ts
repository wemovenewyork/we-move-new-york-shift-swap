import { prisma } from "@/lib/prisma";
import { sendPush, PushPayload } from "@/lib/pushNotify";

const BATCH_SIZE = 50;

/**
 * Send a push notification to all registered devices for a user.
 * Silently ignores failures so callers don't need to handle errors.
 */
export async function notifyUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    await Promise.allSettled(subs.map(sub => sendPush(sub, payload)));
  } catch {
    // Never let notification failure break the main request
  }
}

/**
 * Fan-out push notifications to many users efficiently.
 * Processes in batches of BATCH_SIZE to avoid serverless timeout.
 * Silently ignores failures.
 */
export async function notifyMany(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return;
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });
    if (!subs.length) return;

    // Process in batches to stay within Vercel's 10s function limit
    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      const batch = subs.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(sub => sendPush(sub, payload)));
    }
  } catch {
    // Never let notification failure break the main request
  }
}
