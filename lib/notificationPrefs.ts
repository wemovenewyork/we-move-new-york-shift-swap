// A7: per-category notification preferences.
//
// Stored as sparse JSON on users.notification_prefs and merged over
// DEFAULT_PREFS at read time — missing keys mean "default", unknown keys are
// ignored, so adding categories later never needs a data migration. Quiet
// hours are push-only suppression (in-app records still write), NY-local.

export type NewPostMode = "all" | "matches" | "digest" | "off";

export type NotificationCategory =
  | "new_post"
  | "message"
  | "agreement"
  | "swap_updates"
  | "announcements"
  | "digest";

export interface NotificationPrefs {
  new_post: NewPostMode;
  message: boolean;
  agreement: boolean;
  swap_updates: boolean;
  announcements: boolean;
  digest: boolean;
}

export interface UserNotifySettings {
  prefs: NotificationPrefs;
  quietStart: string | null;
  quietEnd: string | null;
}

// Locked decision: new_post defaults to digest — no real-time blast unless
// the user opts into `all` or `matches`.
export const DEFAULT_PREFS: NotificationPrefs = {
  new_post: "digest",
  message: true,
  agreement: true,
  swap_updates: true,
  announcements: true,
  digest: true,
};

// Personal categories keep in-app records even when disabled (the event
// concerns the user directly and must stay discoverable in the inbox).
// Broadcast categories disappear entirely when declined.
export const PERSONAL_CATEGORIES: ReadonlySet<NotificationCategory> = new Set([
  "message",
  "agreement",
  "swap_updates",
  "announcements",
] as NotificationCategory[]);

const NEW_POST_MODES: ReadonlySet<string> = new Set(["all", "matches", "digest", "off"]);
const BOOL_KEYS = ["message", "agreement", "swap_updates", "announcements", "digest"] as const;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Merge stored sparse JSON over defaults. Unknown keys dropped, bad values ignored. */
export function mergePrefs(stored: unknown): NotificationPrefs {
  const merged: NotificationPrefs = { ...DEFAULT_PREFS };
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    const o = stored as Record<string, unknown>;
    if (typeof o.new_post === "string" && NEW_POST_MODES.has(o.new_post)) {
      merged.new_post = o.new_post as NewPostMode;
    }
    for (const k of BOOL_KEYS) {
      if (typeof o[k] === "boolean") merged[k] = o[k] as boolean;
    }
  }
  return merged;
}

/** Load one user's merged settings. */
export async function getPrefs(userId: string): Promise<UserNotifySettings> {
  const { prisma } = await import("@/lib/prisma");
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true, quietStart: true, quietEnd: true },
  });
  return {
    prefs: mergePrefs(u?.notificationPrefs),
    quietStart: u?.quietStart ?? null,
    quietEnd: u?.quietEnd ?? null,
  };
}

/** Load many users' merged settings in ONE query. */
export async function getPrefsMany(userIds: string[]): Promise<Map<string, UserNotifySettings>> {
  const map = new Map<string, UserNotifySettings>();
  if (userIds.length === 0) return map;
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, notificationPrefs: true, quietStart: true, quietEnd: true },
  });
  for (const r of rows) {
    map.set(r.id, {
      prefs: mergePrefs(r.notificationPrefs),
      quietStart: r.quietStart ?? null,
      quietEnd: r.quietEnd ?? null,
    });
  }
  // Users not found (deleted mid-flight) fall back to defaults.
  for (const id of userIds) {
    if (!map.has(id)) map.set(id, { prefs: { ...DEFAULT_PREFS }, quietStart: null, quietEnd: null });
  }
  return map;
}

/** Current HH:MM in America/New_York. Exposed for tests via `now` override. */
export function nyTimeHHMM(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

/**
 * True when the current NY-local time falls inside the quiet window.
 * Handles wrap-around (22:00 → 07:00). Start is inclusive, end exclusive.
 * Null/missing/invalid config = no quiet hours.
 */
export function isQuietNow(
  quietStart: string | null | undefined,
  quietEnd: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!quietStart || !quietEnd) return false;
  if (!HHMM.test(quietStart) || !HHMM.test(quietEnd)) return false;
  if (quietStart === quietEnd) return false; // degenerate window = off
  const t = nyTimeHHMM(now);
  if (quietStart < quietEnd) {
    return t >= quietStart && t < quietEnd;
  }
  // Wrap-around window, e.g. 22:00 → 07:00
  return t >= quietStart || t < quietEnd;
}

export interface PrefsUpdate {
  prefs?: Partial<NotificationPrefs>;
  quietStart?: string | null;
  quietEnd?: string | null;
}

/**
 * Validate a PUT payload. Returns the sanitized update or an error string.
 * Only known keys with valid values pass; quiet hours must both be HH:MM or
 * both be null (clearing).
 */
export function validatePrefsUpdate(body: unknown): { update?: PrefsUpdate; error?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid payload" };
  const o = body as Record<string, unknown>;
  const update: PrefsUpdate = {};

  if (o.prefs !== undefined) {
    if (!o.prefs || typeof o.prefs !== "object" || Array.isArray(o.prefs)) return { error: "Invalid prefs" };
    const p = o.prefs as Record<string, unknown>;
    const sanitized: Partial<NotificationPrefs> = {};
    for (const [k, v] of Object.entries(p)) {
      if (k === "new_post") {
        if (typeof v !== "string" || !NEW_POST_MODES.has(v)) return { error: "new_post must be one of all, matches, digest, off" };
        sanitized.new_post = v as NewPostMode;
      } else if ((BOOL_KEYS as readonly string[]).includes(k)) {
        if (typeof v !== "boolean") return { error: `${k} must be true or false` };
        sanitized[k as (typeof BOOL_KEYS)[number]] = v;
      } else {
        return { error: `Unknown preference: ${k}` };
      }
    }
    update.prefs = sanitized;
  }

  const qs = o.quietStart;
  const qe = o.quietEnd;
  if (qs !== undefined || qe !== undefined) {
    if (qs === null && qe === null) {
      update.quietStart = null;
      update.quietEnd = null;
    } else if (typeof qs === "string" && typeof qe === "string") {
      if (!HHMM.test(qs) || !HHMM.test(qe)) return { error: "Quiet hours must be HH:MM (24-hour)" };
      update.quietStart = qs;
      update.quietEnd = qe;
    } else {
      return { error: "quietStart and quietEnd must both be set (HH:MM) or both be null" };
    }
  }

  if (update.prefs === undefined && update.quietStart === undefined) {
    return { error: "Nothing to update" };
  }
  return { update };
}
