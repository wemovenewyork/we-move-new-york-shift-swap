"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Depot } from "@/types";
import { C } from "@/constants/colors";
import DepotBadge from "@/components/ui/DepotBadge";
import Icon from "@/components/ui/Icon";

export default function ActionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;
  const [depot, setDepot] = useState<Depot | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!code) return;
    api.get<Depot>(`/depots/${code}`).then(setDepot).catch(() => router.replace("/depots"));
    api.get<{ unreadCount: number }>("/messages").then(d => setUnread(d.unreadCount)).catch(() => {});
  }, [code, router]);

  if (!depot) return null;

  const options = [
    { k: "browse", ic: "list", t: "View Available Swaps", cl: C.blue, href: `/depot/${code}/swaps` },
    { k: "post", ic: "edit", t: "Post a Swap", cl: C.gold, href: `/depot/${code}/post` },
    { k: "my", ic: "usr", t: "My Posts", cl: "#00C9A7", href: `/depot/${code}/my` },
    { k: "messages", ic: "msg", t: "Messages", cl: "#C084FC", href: `/depot/${code}/messages`, badge: unread },
    { k: "matches", ic: "match", t: "Mutual Matches", cl: "#F59E0B", href: `/depot/${code}/matches` },
    { k: "history", ic: "clk", t: "My Swap History", cl: "#60A5FA", href: `/depot/${code}/history` },
    ...(user?.role === "depotRep" || user?.role === "admin"
      ? [{ k: "rep", ic: "shield", t: "Rep Dashboard", cl: "#C084FC", href: `/depot/${code}/rep` }]
      : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ background: "rgba(1,0,40,.75)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/depots")} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <DepotBadge depot={depot} size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{depot.name}</div>
          <div style={{ fontSize: 10, color: C.m }}>{depot.operator}</div>
        </div>
        <button onClick={() => router.push("/profile")} aria-label="Profile" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="usr" s={15} />
        </button>
      </div>

      <main id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 20px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <DepotBadge depot={depot} size={80} />
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginTop: 16, textAlign: "center" }}>{depot.name}</h2>
        <div style={{ fontSize: 12, color: C.gold, letterSpacing: 4, textTransform: "uppercase", marginTop: 30, marginBottom: 16 }}>What would you like to do?</div>
        <div style={{ display: "grid", gap: 10, width: "100%" }}>
          {options.map(o => (
            <button
              key={o.k}
              onClick={() => router.push(o.href)}
              onMouseEnter={() => setHovered(o.k)}
              onMouseLeave={() => setHovered(null)}
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "18px 20px", borderRadius: 16, border: "none", cursor: "pointer", textAlign: "left", transition: "all .25s", background: hovered === o.k ? o.cl + "12" : "rgba(255,255,255,.025)", backdropFilter: "blur(8px)", boxShadow: hovered === o.k ? `0 12px 40px rgba(0,0,0,.2), inset 0 0 0 1px ${o.cl}33` : `inset 0 0 0 1px rgba(255,255,255,.05)`, transform: hovered === o.k ? "translateY(-3px)" : "none" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: o.cl + "18", border: `1px solid ${o.cl}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: o.cl }}>
                <Icon n={o.ic} s={20} />
              </div>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", gap: 8 }}>
                {o.t}
                {(o.badge ?? 0) > 0 && (
                  <span role="status" aria-label={o.badge + " notifications"} style={{ background: C.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, minWidth: 20, textAlign: "center" }}>{o.badge}</span>
                )}
              </div>
              <Icon n="chev" s={16} c={o.cl} />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
