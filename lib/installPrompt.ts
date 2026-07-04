// Pure, testable logic for the PWA install prompt. The React component
// (components/InstallPrompt.tsx) owns all browser/DOM/event wiring.

export const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const MAX_SHOWS = 3; // lifetime
export const MIN_SESSIONS = 2; // show from the 2nd session on

export interface InstallPromptStored {
  dismissedAt: number | null;
  showCount: number;
  sessionCount: number;
}

export type Platform = "installed" | "ios" | "other";

/** Classify from UA + standalone flag. `installed` short-circuits everything. */
export function detectPlatform(ua: string, standalone: boolean): Platform {
  if (standalone) return "installed";
  // iPadOS 13+ reports as Mac; the touch check disambiguates (passed in by caller).
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

/**
 * Timing + dismissal gate. Shown only once the user has ≥ MIN_SESSIONS
 * sessions (the "authenticated AND has interacted" signal we picked — a
 * localStorage session counter), under the lifetime cap, and outside the
 * post-dismissal cooldown.
 */
export function canShowInstallPrompt(s: InstallPromptStored, now: number): boolean {
  if (s.sessionCount < MIN_SESSIONS) return false;
  if (s.showCount >= MAX_SHOWS) return false;
  if (s.dismissedAt != null && now - s.dismissedAt < COOLDOWN_MS) return false;
  return true;
}
