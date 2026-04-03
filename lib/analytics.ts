"use client";
// Analytics wrapper — swap PostHog for any other tool by changing this file only.
// All calls are no-ops if NEXT_PUBLIC_POSTHOG_KEY is not set or if window is undefined.

import posthog from "posthog-js";

let initialized = false;

export function initAnalytics() {
  if (typeof window === "undefined") return;
  if (initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage",
    autocapture: false,
    respect_dnt: true,
  });
  initialized = true;
}

export function identifyUser(userId: string, props: {
  role?: string;
  depot?: string;
  language?: string;
  jobTitle?: string;
}) {
  if (typeof window === "undefined" || !initialized) return;
  posthog.identify(userId, props);
}

export function resetAnalytics() {
  if (typeof window === "undefined" || !initialized) return;
  posthog.reset();
}

export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined" || !initialized) return;
  posthog.capture(event, props);
}

// Typed event helpers
export const analytics = {
  pageView: (path: string) => track("$pageview", { $current_url: path }),

  // Auth
  signupStarted: () => track("signup_started"),
  signupCompleted: (method: "email") => track("signup_completed", { method }),
  loginCompleted: () => track("login_completed"),
  logoutCompleted: () => track("logout_completed"),

  // Onboarding
  profileSetupCompleted: (depotCode: string) => track("profile_setup_completed", { depot: depotCode }),
  onboardingCompleted: () => track("onboarding_completed"),
  checklistItemCompleted: (item: string) => track("checklist_item_completed", { item }),
  checklistDismissed: (completedCount: number) => track("checklist_dismissed", { completed_count: completedCount }),

  // Swaps
  swapPosted: (props: { type: string; depot: string; swapType?: string }) => track("swap_posted", props),
  swapViewed: (swapId: string, depot: string) => track("swap_viewed", { swap_id: swapId, depot }),
  swapSaved: (swapId: string) => track("swap_saved", { swap_id: swapId }),
  swapShared: (swapId: string, method: string) => track("swap_shared", { swap_id: swapId, method }),
  swapFiltered: (filters: Record<string, unknown>) => track("swap_filtered", filters),

  // Agreements
  agreementStarted: (swapId: string) => track("agreement_started", { swap_id: swapId }),
  agreementCompleted: (swapId: string) => track("agreement_completed", { swap_id: swapId }),

  // Messages
  messageSent: (threadId: string) => track("message_sent", { thread_id: threadId }),

  // Profile
  avatarUploaded: () => track("avatar_uploaded"),
  pushEnabled: () => track("push_enabled"),
  languageChanged: (lang: string) => track("language_changed", { language: lang }),
  feedbackSubmitted: () => track("feedback_submitted"),
  dataDownloaded: () => track("data_downloaded"),

  // Errors
  errorShown: (error: string, page: string) => track("error_shown", { error, page }),
};
