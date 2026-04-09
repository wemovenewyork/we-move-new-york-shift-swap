"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { useT } from "@/lib/i18n";
import { playClick } from "@/lib/sound";

interface Props {
  active: "browse" | "post" | "my" | "messages" | "saved" | "matches";
  depotCode: string;
  lang?: string;
}

export default function BottomNav({ active, depotCode, lang }: Props) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [activeTab, setActiveTab] = useState<"browse" | "post" | "my" | "messages" | "saved" | "matches">(active);
  const [pressed, setPressed] = useState<string | null>(null);
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
    { k: "matches", ic: "match", l: tr("nav.matches"), href: `/depot/${depotCode}/matches` },
    { k: "my", ic: "usr", l: tr("nav.my"), href: `/depot/${depotCode}/my` },
    { k: "messages", ic: "msg", l: tr("nav.messages"), href: `/depot/${depotCode}/messages`, badge: unread },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: "rgba(1,0,40,.9)",
        backdropFilter: "blur(28px)",
        borderTop: "1px solid rgba(255,255,255,.06)",
        padding: "6px 0 max(12px, env(safe-area-inset-bottom))",
        display: "flex",
        justifyContent: "space-around",
      }}
    >
      <style>{`
        @keyframes pulseBadge { 0%,100%{box-shadow:0 0 0 0 rgba(255,71,87,.4)} 50%{box-shadow:0 0 0 5px rgba(255,71,87,0)} }
        @keyframes tabBounce { 0%{transform:translateY(0)} 40%{transform:translateY(-5px)} 70%{transform:translateY(1px)} 100%{transform:translateY(0)} }
        @keyframes indicatorSlide { from{opacity:0;transform:scaleX(0)} to{opacity:1;transform:scaleX(1)} }
      `}</style>

      {items.map(i => {
        const isActive = activeTab === i.k;
        return (
          <button
            key={i.k}
            onClick={() => {
              playClick();
              setPressed(i.k);
              setActiveTab(i.k as typeof activeTab);
              setTimeout(() => setPressed(null), 300);
              router.push(i.href);
            }}
            aria-label={i.l + ((i.badge ?? 0) > 0 ? `, ${i.badge} unread` : "")}
            aria-current={isActive ? "page" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: isActive ? C.gold : C.m,
              padding: "4px 16px",
              position: "relative",
              minWidth: 60,
              transition: "color .2s ease",
            }}
          >
            {/* Active indicator pill above icon */}
            <div style={{
              position: "absolute",
              top: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: isActive ? 24 : 0,
              height: 3,
              borderRadius: 2,
              background: C.gold,
              boxShadow: isActive ? `0 0 10px ${C.gold}80` : "none",
              transition: "width .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease",
            }} />

            {/* Icon with bounce on press */}
            <div style={{
              position: "relative",
              animation: pressed === i.k ? "tabBounce .3s ease" : "none",
              filter: isActive ? `drop-shadow(0 0 6px ${C.gold}60)` : "none",
              transition: "filter .2s ease",
            }}>
              <Icon n={i.ic} s={20} c={isActive ? C.gold : C.m} />
              {(i.badge ?? 0) > 0 && (
                <span
                  role="status"
                  aria-label={`${i.badge} unread messages`}
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -7,
                    background: C.red,
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 8,
                    minWidth: 16,
                    textAlign: "center",
                    lineHeight: "14px",
                    animation: "pulseBadge 2s ease infinite",
                  }}
                >
                  {i.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: isActive ? 0.3 : 0,
              transition: "font-weight .2s, letter-spacing .2s",
            }}>
              {i.l}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
