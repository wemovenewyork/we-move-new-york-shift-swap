"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "./Icon";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer as ArrayBuffer;
}

export default function NotifToggle() {
  const [state, setState] = useState<"loading" | "unsupported" | "blocked" | "off" | "on">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? "on" : "off");
      });
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
      // If permission denied mid-flow
      if (Notification.permission === "denied") setState("blocked");
    } finally {
      setBusy(false);
    }
  };

  if (state === "unsupported") return null;

  const label = state === "on" ? "Notifications On" : state === "blocked" ? "Notifications Blocked" : "Enable Notifications";
  const color = state === "on" ? "#00C9A7" : state === "blocked" ? C.red : C.m;

  return (
    <button
      onClick={toggle}
      disabled={busy || state === "blocked" || state === "loading"}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${color}33`, background: state === "on" ? "rgba(0,201,167,.08)" : "rgba(255,255,255,.03)", cursor: state === "blocked" ? "not-allowed" : "pointer", opacity: busy || state === "loading" ? 0.6 : 1 }}
    >
      <Icon n="bell" s={18} c={color} />
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{label}</div>
        {state === "blocked" && <div style={{ fontSize: 10, color: C.m, marginTop: 1 }}>Allow notifications in browser settings</div>}
        {state === "on" && <div style={{ fontSize: 10, color: color, marginTop: 1 }}>You&apos;ll get daily swap digests</div>}
      </div>
      <div style={{ width: 36, height: 20, borderRadius: 10, background: state === "on" ? "#00C9A7" : C.s, border: `1px solid ${color}33`, display: "flex", alignItems: "center", padding: "0 3px", transition: "background .2s" }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: state === "on" ? "#fff" : C.m, marginLeft: state === "on" ? "auto" : 0, transition: "margin .2s" }} />
      </div>
    </button>
  );
}
