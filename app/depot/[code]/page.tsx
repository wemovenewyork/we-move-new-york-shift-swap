"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Depot } from "@/types";
import { C } from "@/constants/colors";
import DepotBadge from "@/components/ui/DepotBadge";
import Icon from "@/components/ui/Icon";
import InboxIcon from "@/components/ui/InboxIcon";
import NotifIcon from "@/components/ui/NotifIcon";
import PushBanner from "@/components/ui/PushBanner";
import { playClick, isMuted, toggleMute } from "@/lib/sound";
import OfflineBanner from "@/components/ui/OfflineBanner";
import FeedbackButton from "@/components/ui/FeedbackButton";
import { t } from "@/lib/i18n";
import Onboarding from "@/components/screens/Onboarding";
import OnboardingChecklist from "@/components/ui/OnboardingChecklist";

export default function ActionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;
  const [depot, setDepot] = useState<Depot | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [stats, setStats] = useState<{ completed: number; active: number } | null>(null);
  const [openWorkCount, setOpenWorkCount] = useState(0);
  const [logoSpin, setLogoSpin] = useState(false);
  const [muted, setMuted] = useState(() => typeof window !== "undefined" ? isMuted() : false);
  const [showTip, setShowTip] = useState(() => typeof window !== "undefined" && !localStorage.getItem("onboarding-done"));

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !user.depotId) router.replace("/setup-profile");
    if (!loading && user?.depot && user.depot.code !== code && user.role !== "admin" && user.role !== "subAdmin") router.replace(`/depot/${user.depot.code}/swaps`);
  }, [user, loading, router, code]);

  useEffect(() => {
    if (!code) return;
    api.get<Depot>(`/depots/${code}`).then(setDepot).catch(() => router.replace("/depots"));
    api.get<{ unreadCount: number }>("/messages").then(d => setUnread(d.unreadCount)).catch(() => {});
    api.get<{ completed: number; active: number }>(`/depots/${code}/stats`).then(setStats).catch(() => {});
    api.get<{ swaps: { id: string }[]; total?: number }>("/swaps?category=open_work&status=open&limit=50")
      .then(d => setOpenWorkCount(d.swaps.length))
      .catch(() => {});
  }, [code, router]);

  if (!depot) return null;

  const lang = user?.language ?? "en";
  const options = [
    { k: "browse", ic: "list", label: t("browse", lang) || "Browse Swaps", cl: C.blue, href: `/depot/${code}/swaps`, count: depot.openSwaps ?? 0 },
    { k: "post", ic: "edit", label: t("post", lang) || "Post a Swap", cl: C.gold, href: `/depot/${code}/post` },
    { k: "my", ic: "usr", label: t("my", lang) || "My Posted Swaps", cl: "#00C9A7", href: `/depot/${code}/my` },
    { k: "messages", ic: "msg", label: t("messages", lang) || "My Messages", cl: "#C084FC", href: `/depot/${code}/messages`, badge: unread },
    { k: "saved", ic: "saved", label: t("saved", lang) || "My Saved Swaps", cl: C.gold, href: `/depot/${code}/saved` },
    { k: "matches", ic: "match", label: t("matches", lang) || "My Matches", cl: "#F59E0B", href: `/depot/${code}/matches` },
    { k: "history", ic: "clk", label: t("history", lang) || "My History", cl: "#60A5FA", href: `/depot/${code}/history` },
    ...(user?.role === "depotRep" || user?.role === "admin"
      ? [{ k: "rep", ic: "shield", label: "Rep Dashboard", cl: "#C084FC", href: `/depot/${code}/rep` }]
      : []),
  ];

  return (
    <div className="page-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <OfflineBanner />
      <style>{`
        @keyframes rotateLogo { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes rotateFast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ background: "rgba(1,0,40,.75)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/depots")} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <div
          onClick={() => {
            setLogoSpin(true);
            setTimeout(() => setLogoSpin(false), 1000);
          }}
          style={{ cursor: "pointer", animation: logoSpin ? "rotateFast 0.4s linear infinite" : "rotateLogo 8s linear infinite" }}
        >
          <DepotBadge depot={depot} size={38} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{depot.name}</div>
          <div style={{ fontSize: 10, color: C.m }}>{depot.operator}</div>
        </div>
        <NotifIcon />
        <InboxIcon />
        <button
          onClick={() => { const next = toggleMute(); setMuted(next); }}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: muted ? C.m : C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          {muted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 010 7.07"/>
              <path d="M19.07 4.93a10 10 0 010 14.14"/>
            </svg>
          )}
        </button>
        <button onClick={() => router.push("/profile")} aria-label="Profile" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="usr" s={15} />
        </button>
      </div>

      {showTip && (
        <Onboarding onDone={() => {
          localStorage.setItem("onboarding-done", "1");
          setShowTip(false);
        }} />
      )}
      <main id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "24px 20px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <PushBanner />
        {stats && (
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}`, borderRadius: 20, padding: "6px 14px", fontSize: 11, color: C.m, fontWeight: 600 }}>
              <span style={{ color: C.gold }}>{stats.completed}</span> completed this month
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}`, borderRadius: 20, padding: "6px 14px", fontSize: 11, color: C.m, fontWeight: 600 }}>
              <span style={{ color: C.gold }}>{stats.active}</span> active swaps
            </div>
          </div>
        )}
        {openWorkCount > 0 && (
          <button
            onClick={() => { playClick(); router.push(`/depot/${code}/swaps?category=open_work`); }}
            style={{ width: "100%", marginBottom: 16, padding: "16px 20px", borderRadius: 16, border: "none", cursor: "pointer", textAlign: "left", background: "rgba(34,211,238,.08)", boxShadow: "inset 0 0 0 1.5px rgba(34,211,238,.35), 0 0 24px rgba(34,211,238,.08)", display: "flex", alignItems: "center", gap: 14 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(34,211,238,.15)", border: "1px solid rgba(34,211,238,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
              🚌
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#22D3EE", marginBottom: 2 }}>
                {openWorkCount} open shift{openWorkCount !== 1 ? "s" : ""} need{openWorkCount === 1 ? "s" : ""} coverage
              </div>
              <div style={{ fontSize: 11, color: "rgba(34,211,238,.7)" }}>
                Dispatcher posted · Tap to view open work
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}

        <div style={{ display: "grid", gap: 10, width: "100%" }}>
          {options.map(o => (
            <button
              key={o.k}
              onClick={() => { playClick(); router.push(o.href); }}
              onMouseEnter={() => setHovered(o.k)}
              onMouseLeave={() => setHovered(null)}
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "18px 20px", borderRadius: 16, border: "none", cursor: "pointer", textAlign: "left", transition: "all .25s", background: hovered === o.k ? o.cl + "12" : "rgba(255,255,255,.025)", backdropFilter: "blur(8px)", boxShadow: hovered === o.k ? `0 12px 40px rgba(0,0,0,.2), inset 0 0 0 1px ${o.cl}33` : `inset 0 0 0 1px rgba(255,255,255,.05)`, transform: hovered === o.k ? "translateY(-3px)" : "none" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: o.cl + "18", border: `1px solid ${o.cl}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: o.cl }}>
                <Icon n={o.ic} s={20} />
              </div>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", gap: 8 }}>
                {o.label}
                {(o.badge ?? 0) > 0 && (
                  <span role="status" aria-label={o.badge + " notifications"} style={{ background: C.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, minWidth: 20, textAlign: "center" }}>{o.badge}</span>
                )}
                {"count" in o && (o.count ?? 0) > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, background: C.blue + "18", border: `1px solid ${C.blue}33`, padding: "2px 8px", borderRadius: 8 }}>{o.count} open</span>
                )}
              </div>
              <Icon n="chev" s={16} c={o.cl} />
            </button>
          ))}
        </div>
      </main>
      {user && <OnboardingChecklist userId={user.id} depotCode={code} />}
      <FeedbackButton />
    </div>
  );
}
