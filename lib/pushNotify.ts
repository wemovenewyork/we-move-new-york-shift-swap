import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

function initVapid() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? "",
    process.env.VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? ""
  );
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    initVapid();
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (e) {
    // A7: dead-subscription cleanup is centralized here (it used to live only
    // in the daily-digest cron). 404/410 = endpoint permanently gone — remove
    // the subscription so future fan-outs stop paying for it. Non-fatal.
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) {
      try {
        const { prisma } = await import("@/lib/prisma");
        await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } });
      } catch { /* cleanup is best-effort */ }
    }
    return false;
  }
}
