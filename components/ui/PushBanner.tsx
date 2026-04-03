"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

function urlBase64ToUint8Array(b64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out.buffer as ArrayBuffer;
}

export default function PushBanner() {
  const [state, setState] = useState<"loading" | "unsupported" | "blocked" | "off" | "on">("loading");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("push-banner-dismissed")) { setDismissed(true); return; }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("blocked"); return; }
    navigator.serviceWorker.register("/sw.js").then(reg => {
      reg.pushManager.getSubscription().then(sub => setState(sub ? "on" : "off"));
    }).catch(() => setState("unsupported"));
  }, []);

  const toggle = async () => {
    if (busy || state === "blocked" || state === "unsupported" || state === "loading") return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (state === "on") {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.delete("/push/subscribe", { endpoint: sub.endpoint });
          await sub.unsubscribe();
        }
        setState("off");
      } else {
        const { publicKey } = await api.get<{ publicKey: string }>("/push/subscribe");
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const json = sub.toJSON();
        await api.post("/push/subscribe", {
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        });
        setState("on");
      }
    } catch {
      if (Notification.permission === "denied") setState("blocked");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem("push-banner-dismissed", "1");
    setDismissed(true);
  };

  if (dismissed || state === "loading" || state === "unsupported" || state === "on") return null;

  const isBlocked = state === "blocked";

  return (
    <div style={{
      margin: "0 0 12px",
      borderRadius: 16,
      border: `1px solid ${isBlocked ? C.red + "44" : C.gold + "33"}`,
      background: isBlocked ? "rgba(239,68,68,.06)" : "rgba(209,173,56,.06)",
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: isBlocked ? "rgba(239,68,68,.12)" : "rgba(209,173,56,.12)",
        border: `1px solid ${isBlocked ? C.red + "33" : C.gold + "33"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon n="bell" s={18} c={isBlocked ? C.red : C.gold} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>
          {isBlocked ? "Notifications blocked" : "Turn on notifications"}
        </div>
        <div style={{ fontSize: 11, color: C.m, marginTop: 2 }}>
          {isBlocked
            ? "Allow notifications in your browser settings"
            : "Get alerted when someone messages you or posts a matching swap"}
        </div>
      </div>

      {!isBlocked && (
        <button
          onClick={toggle}
          disabled={busy}
          aria-label="Turn on notifications"
          aria-checked={false}
          role="switch"
          style={{
            flexShrink: 0,
            width: 50, height: 28,
            borderRadius: 14,
            border: "none",
            cursor: busy ? "default" : "pointer",
            background: "rgba(255,255,255,.12)",
            position: "relative",
            transition: "background .2s",
            opacity: busy ? 0.6 : 1,
          }}
        >
          <span style={{
            position: "absolute",
            top: 3,
            left: 3,
            width: 22, height: 22,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,.35)",
            transition: "left .2s",
          }} />
        </button>
      )}

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0, lineHeight: 0 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.m} strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
