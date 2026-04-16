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
  } catch {
    return false;
  }
}
