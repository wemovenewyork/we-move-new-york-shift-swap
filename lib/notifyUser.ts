import { prisma } from "@/lib/prisma";
import { sendPush, PushPayload } from "@/lib/pushNotify";

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
