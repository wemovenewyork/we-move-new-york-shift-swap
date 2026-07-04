"use client";

import { useEffect, useState } from "react";
import { C } from "@/constants/colors";
import {
  detectPlatform,
  canShowInstallPrompt,
  InstallPromptStored,
  MAX_SHOWS,
} from "@/lib/installPrompt";

// iOS delivers web push only to installed (home-screen) PWAs, and Android
// buries the install affordance — so un-installed users are invisible to the
// notification system. This banner fixes both, then hands off to the existing
// push flow post-install (install → push reach).

const K_DISMISSED = "installPromptDismissedAt";
const K_SHOWS = "installPromptShowCount";
const K_SESSIONS = "wmny_session_count";
const K_SESSION_TICK = "wmny_session_ticked"; // sessionStorage: one bump/session
const K_IOS_PUSH_PROMPTED = "wmny_ios_push_prompted";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// The push-subscribe flow (PushBanner) is "about to ask" when push is
// supported, permission is still default, and it hasn't been dismissed.
// The install banner yields to it — never two prompts in one session.
function pushWillAsk(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "default") return false;
  if (localStorage.getItem("push-banner-dismissed")) return false;
  return true;
}

function readStored(): InstallPromptStored {
  if (typeof window === "undefined") return { dismissedAt: null, showCount: 0, sessionCount: 0 };
  const dismissed = Number(localStorage.getItem(K_DISMISSED));
  return {
    dismissedAt: Number.isFinite(dismissed) && dismissed > 0 ? dismissed : null,
    showCount: Number(localStorage.getItem(K_SHOWS)) || 0,
    sessionCount: Number(localStorage.getItem(K_SESSIONS)) || 0,
  };
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [platform] = useState<"ios" | "other">(() =>
    typeof navigator !== "undefined" && detectPlatform(navigator.userAgent, false) === "ios" ? "ios" : "other"
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  // Post-install push hand-off (3b): on iOS first standalone launch, re-surface
  // the existing push flow once by clearing its dismissal.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() && !localStorage.getItem(K_IOS_PUSH_PROMPTED)) {
      localStorage.setItem(K_IOS_PUSH_PROMPTED, "1");
      localStorage.removeItem("push-banner-dismissed");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return; // installed → never show

    // One session bump per browser session.
    if (!sessionStorage.getItem(K_SESSION_TICK)) {
      sessionStorage.setItem(K_SESSION_TICK, "1");
      localStorage.setItem(K_SESSIONS, String((Number(localStorage.getItem(K_SESSIONS)) || 0) + 1));
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // appinstalled (Android): hand off to the push flow.
    const onInstalled = () => {
      localStorage.removeItem("push-banner-dismissed");
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    // Decide visibility shortly after mount so beforeinstallprompt can arrive
    // and the push flow gets right of way.
    const t = setTimeout(() => {
      if (pushWillAsk()) return; // yield to the push prompt
      const stored = readStored();
      if (!canShowInstallPrompt(stored, Date.now())) return;
      // iOS has no event; Android needs the captured prompt.
      const android = "onbeforeinstallprompt" in window;
      if (platform !== "ios" && !android) return;
      localStorage.setItem(K_SHOWS, String(Math.min(stored.showCount + 1, MAX_SHOWS)));
      setVisible(true);
    }, 1200);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, [platform]);

  const dismiss = () => {
    localStorage.setItem(K_DISMISSED, String(Date.now()));
    setVisible(false);
    setShowIosSheet(false);
  };

  const onCta = async () => {
    if (platform === "ios") {
      setShowIosSheet(true);
      return;
    }
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => {});
      setDeferred(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <div style={{ position: "fixed", left: 12, right: 12, bottom: 76, zIndex: 200, background: "rgba(1,0,40,.96)", backdropFilter: "blur(20px)", border: `1px solid ${C.gg}`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 30px rgba(0,0,0,.4)" }}>
        <div style={{ fontSize: 22 }}>📲</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Install Shift Swap</div>
          <div style={{ fontSize: 11, color: C.m, lineHeight: 1.4 }}>Faster access + notifications that work.</div>
        </div>
        <button onClick={onCta} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          Install
        </button>
        <button onClick={dismiss} aria-label="Dismiss" style={{ padding: 6, background: "none", border: "none", color: C.m, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
      </div>

      {showIosSheet && (
        <div onClick={() => setShowIosSheet(false)} style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: C.bg, borderRadius: "20px 20px 0 0", border: `1px solid ${C.bd}`, padding: "24px 20px 32px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.white, marginBottom: 16 }}>Add to Home Screen</div>
            <Step n={1} label="Tap the Share button in Safari">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </Step>
            <Step n={2} label='Choose "Add to Home Screen"'>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </Step>
            <div style={{ fontSize: 11, color: C.m, marginTop: 14, lineHeight: 1.5 }}>Push notifications need iOS 16.4 or later.</div>
            <button onClick={dismiss} style={{ width: "100%", marginTop: 18, padding: 12, borderRadius: 12, border: `1px solid ${C.bd}`, background: C.s, color: C.white, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.gs, color: C.gold, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
      <div style={{ flex: 1, fontSize: 13, color: C.white }}>{label}</div>
      {children}
    </div>
  );
}
