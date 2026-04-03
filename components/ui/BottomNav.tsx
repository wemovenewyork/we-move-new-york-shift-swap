"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { useT } from "@/lib/i18n";

interface Props {
  active: "browse" | "post" | "my" | "messages" | "saved" | "matches";
  depotCode: string;
  lang?: string;
}

export default function BottomNav({ active, depotCode, lang }: Props) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const tr = useT(lang);

  useEffect(() => {
    const fetch = () => api.get<{ unreadCount: number }>("/messages").then(d => setUnread(d.unreadCount)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") fetch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const items = [
    { k: "browse", ic: "list", l: tr("nav.swaps"), href: `/depot/${depotCode}/swaps` },
    { k: "matches", ic: "match", l: "Matches", href: `/depot/${depotCode}/matches` },
    { k: "my", ic: "usr", l: "My", href: `/depot/${depotCode}/my` },
    { k: "messages", ic: "msg", l: tr("nav.messages"), href: `/depot/${depotCode}/messages`, badge: unread },
  ];

  return (
    <nav role="navigation" aria-label="Main navigation" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "rgba(1,0,40,.85)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "8px 0 12px", display: "flex", justifyContent: "space-around" }}>
      {items.map(i => (
        <button
          key={i.k}
          onClick={() => router.push(i.href)}
          aria-label={i.l + ((i.badge ?? 0) > 0 ? `, ${i.badge} unread` : "")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", background: "transparent", cursor: "pointer", color: active === i.k ? C.gold : C.m, padding: "4px 12px", position: "relative" }}
        >
          <div style={{ position: "relative" }}>
            <Icon n={i.ic} s={20} c={active === i.k ? C.gold : C.m} />
            {(i.badge ?? 0) > 0 && (
              <span role="status" aria-label={`${i.badge} unread messages`} style={{ position: "absolute", top: -5, right: -7, background: C.red, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 8, minWidth: 16, textAlign: "center", lineHeight: "14px" }}>
                {i.badge}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600 }}>{i.l}</span>
        </button>
      ))}
    </nav>
  );
}
