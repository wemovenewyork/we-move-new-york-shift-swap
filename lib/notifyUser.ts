import { prisma } from "@/lib/prisma";
import { sendPush, PushPayload } from "@/lib/pushNotify";

export type { PushPayload };

const BATCH_SIZE = 50;

/** Persist a single in-app notification record. Non-fatal. */
async function persistNotification(userId: string, payload: PushPayload): Promise<void> {
  // Reject non-relative URLs — notification URLs must stay on-domain.
  const url = payload.url ?? null;
  if (url !== null && !url.startsWith("/")) return;
  try {
    await prisma.notification.create({
      data: { userId, type: "push", title: payload.title, body: payload.body, url },
    });
  } catch { /* never break the main request */ }
}

/** Persist in-app notification records for many users at once. Non-fatal. */
async function persistNotifications(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return;
  const url = payload.url ?? null;
  if (url !== null && !url.startsWith("/")) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId, type: "push", title: payload.title, body: payload.body, url,
      })),
    });
  } catch { /* never break the main request */ }
}

/**
 * Send a push notification to all registered devices for a user
 * and persist an in-app notification record.
 * Silently ignores failures so callers don't need to handle errors.
 */
export async function notifyUser(userId: string, payload: PushPayload): Promise<void> {
  await persistNotification(userId, payload);
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    await Promise.allSettled(subs.map(sub => sendPush(sub, payload)));
  } catch { }
}

/**
 * Send push notification to a user with email fallback,
 * and persist an in-app notification record.
 */
export async function notifyUserWithEmailFallback(
  userId: string,
  payload: PushPayload,
  emailSubject: string,
  emailHtml: string
): Promise<void> {
  await persistNotification(userId, payload);
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length > 0) {
      await Promise.allSettled(subs.map(sub => sendPush(sub, payload)));
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user?.email && !user.email.includes("@deleted.invalid")) {
        const { sendEmail } = await import("@/lib/email");
        try {
          await sendEmail(user.email, emailSubject, emailHtml);
        } catch (e) {
          const Sentry = await import("@sentry/nextjs");
          Sentry.captureException(e, {
            tags: { source: "notify-email-fallback" },
            extra: { userId },
          });
        }
      }
    }
  } catch (e) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(e, {
      tags: { source: "notify-user-with-fallback" },
      extra: { userId },
    });
  }
}

/**
 * Fan-out push notifications to many users efficiently.
 * Persists in-app notification records for all users (even those without push subs).
 * Processes push in batches of BATCH_SIZE to avoid serverless timeout.
 * Silently ignores failures.
 */
export async function notifyMany(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return;
  await persistNotifications(userIds, payload);
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });
    if (!subs.length) return;
    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      const batch = subs.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(sub => sendPush(sub, payload)));
    }
  } catch { }
}
