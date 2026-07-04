import { prisma } from "@/lib/prisma";
import { sendPush, PushPayload as BasePushPayload } from "@/lib/pushNotify";
import {
  NotificationCategory,
  PERSONAL_CATEGORIES,
  getPrefs,
  getPrefsMany,
  isQuietNow,
  UserNotifySettings,
} from "@/lib/notificationPrefs";

// A7: every notification MUST declare a category — the compile break at every
// call site is the completeness check. Delivery is filtered centrally here:
//
// | Condition                                  | Push | In-app | Email fb |
// | Enabled, not quiet hours                   |  ✓   |   ✓    |    ✓     |
// | Enabled, quiet hours                       |  ✗   |   ✓    |    ✗     |
// | Disabled — personal category               |  ✗   |   ✓    |    ✗     |
// | Disabled — broadcast (new_post, digest)    |  ✗   |   ✗    |    ✗     |
//
// Personal events stay discoverable in the in-app inbox even when muted;
// broadcast noise disappears entirely when declined.

export type PushPayload = BasePushPayload & { category: NotificationCategory };
export type { NotificationCategory };

const BATCH_SIZE = 50;

/** Is this category enabled for push under these settings? */
function categoryEnabled(s: UserNotifySettings, category: NotificationCategory): boolean {
  if (category === "new_post") {
    // Real-time new-post pushes only for "all"/"matches" (recipient targeting
    // for "matches" happens at the call site; here it's on/off semantics).
    return s.prefs.new_post === "all" || s.prefs.new_post === "matches";
  }
  return s.prefs[category] === true;
}

/** Should an in-app record persist even when push is filtered out? */
function shouldPersist(s: UserNotifySettings, category: NotificationCategory): boolean {
  if (categoryEnabled(s, category)) return true; // quiet hours never block records
  if (category === "new_post") return false; // digest/off modes: no in-app spam
  return PERSONAL_CATEGORIES.has(category);
}

/** Push allowed = category enabled AND not inside the quiet window. */
function shouldPush(s: UserNotifySettings, category: NotificationCategory): boolean {
  return categoryEnabled(s, category) && !isQuietNow(s.quietStart, s.quietEnd);
}

/** Persist a single in-app notification record. Non-fatal. */
async function persistNotification(userId: string, payload: PushPayload): Promise<void> {
  // Reject non-relative URLs — notification URLs must stay on-domain.
  const url = payload.url ?? null;
  if (url !== null && !url.startsWith("/")) return;
  try {
    await prisma.notification.create({
      data: { userId, type: payload.category, title: payload.title, body: payload.body, url },
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
        userId, type: payload.category, title: payload.title, body: payload.body, url,
      })),
    });
  } catch { /* never break the main request */ }
}

/**
 * Send a push notification to all registered devices for a user
 * and persist an in-app notification record — both subject to the
 * user's category preferences and quiet hours (see matrix above).
 * Silently ignores failures so callers don't need to handle errors.
 */
export async function notifyUser(userId: string, payload: PushPayload): Promise<void> {
  let settings: UserNotifySettings;
  try {
    settings = await getPrefs(userId);
  } catch { return; }
  if (shouldPersist(settings, payload.category)) {
    await persistNotification(userId, payload);
  }
  if (!shouldPush(settings, payload.category)) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    await Promise.allSettled(subs.map(sub => sendPush(sub, payload)));
  } catch { }
}

/**
 * Send push notification to a user with email fallback,
 * and persist an in-app notification record. The email fallback fires only
 * when the category is enabled and it isn't quiet hours (same as push).
 */
export async function notifyUserWithEmailFallback(
  userId: string,
  payload: PushPayload,
  emailSubject: string,
  emailHtml: string
): Promise<void> {
  let settings: UserNotifySettings;
  try {
    settings = await getPrefs(userId);
  } catch { return; }
  if (shouldPersist(settings, payload.category)) {
    await persistNotification(userId, payload);
  }
  if (!shouldPush(settings, payload.category)) return;
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
 * Fan-out push notifications to many users efficiently, honoring each
 * recipient's category preference and quiet hours. Preferences load in ONE
 * batch query — no per-user lookups in the loop.
 * Persists in-app records per the delivery matrix.
 * Processes push in batches of BATCH_SIZE to avoid serverless timeout.
 * Silently ignores failures.
 */
export async function notifyMany(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return;
  let settingsMap: Map<string, UserNotifySettings>;
  try {
    settingsMap = await getPrefsMany(userIds);
  } catch { return; }

  const persistIds: string[] = [];
  const pushIds = new Set<string>();
  for (const id of userIds) {
    const s = settingsMap.get(id);
    if (!s) continue;
    if (shouldPersist(s, payload.category)) persistIds.push(id);
    if (shouldPush(s, payload.category)) pushIds.add(id);
  }

  await persistNotifications(persistIds, payload);
  if (pushIds.size === 0) return;
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: [...pushIds] } },
    });
    if (!subs.length) return;
    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      const batch = subs.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(sub => sendPush(sub, payload)));
    }
  } catch { }
}
