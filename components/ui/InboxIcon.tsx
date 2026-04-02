"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

export default function InboxIcon() {
  const [unread, setUnread] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const poll = () =>
      api.get<{ unreadCount: number }>("/messages").then(d => setUnread(d.unreadCount)).catch(() => {});
    poll();
    const interval = setInterval(poll, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  return (
    <button
      onClick={() => router.push("/inbox")}
      aria-label={unread > 0 ? `Inbox — ${unread} unread` : "Inbox"}
      style={{
        position: "relative", width: 36, height: 36, borderRadius: 10,
        border: `1px solid ${unread > 0 ? C.gold + "88" : "rgba(255,255,255,.18)"}`,
        background: unread > 0 ? C.gold + "18" : "rgba(255,255,255,.08)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all .2s",
      }}
    >
      <Icon n="msg" s={16} c={unread > 0 ? C.gold : "rgba(255,255,255,.85)"} />
      {unread > 0 && (
        <span
          role="status"
          aria-label={`${unread} unread messages`}
          style={{
            position: "absolute", top: -5, right: -5, background: C.red, color: "#fff",
            fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 8,
            minWidth: 15, textAlign: "center", lineHeight: "13px", pointerEvents: "none",
          }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
