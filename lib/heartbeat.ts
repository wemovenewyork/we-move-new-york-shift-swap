// Cron heartbeat. Ping a monitoring endpoint (e.g. healthchecks.io) as the
// LAST line of each cron's success path. A cron that fails never pings —
// silence is the alarm. No-op when HEARTBEAT_URL_BASE is unset, so local/dev
// and preview runs stay quiet. Fire-and-forget; swallows every error and never
// throws, so it can never turn a healthy cron run into a failure.
export async function pingHeartbeat(slug: string): Promise<void> {
  const base = process.env.HEARTBEAT_URL_BASE;
  if (!base) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      await fetch(`${base.replace(/\/$/, "")}/${slug}`, { method: "GET", signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* monitoring is best-effort — never affect the cron outcome */
  }
}
