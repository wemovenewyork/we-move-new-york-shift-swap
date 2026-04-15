"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Depot, Swap } from "@/types";
import { C } from "@/constants/colors";
import SwapCard from "@/components/ui/SwapCard";
import DepotBadge from "@/components/ui/DepotBadge";
import Icon from "@/components/ui/Icon";
import Footer from "@/components/ui/Footer";
import BottomNav from "@/components/ui/BottomNav";
import NotifIcon from "@/components/ui/NotifIcon";
import InboxIcon from "@/components/ui/InboxIcon";
import Toast from "@/components/ui/Toast";

export default function SavedSwapsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [depot, setDepot] = useState<Depot | null>(null);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !user.depotId) router.replace("/setup-profile");
    if (!loading && user?.depot && user.depot.code !== code && user.role !== "admin" && user.role !== "subAdmin") router.replace(`/depot/${user.depot.code}/swaps`);
  }, [user, loading, router, code]);

  useEffect(() => {
    if (!code || !user) return;
    api.get<Depot>(`/depots/${code}`).then(setDepot).catch(() => router.replace("/depots"));
    api.get<Swap[]>("/swaps/saved").then(setSwaps).catch(console.error);
  }, [code, user, router]);

  const handleToggleSave = async (swap: Swap) => {
    try {
      await api.del(`/swaps/${swap.id}/save`);
      setSwaps(prev => prev.filter(s => s.id !== swap.id));
    } catch { showToast("Failed to unsave"); }
  };

  if (!depot) return null;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.8)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(`/depot/${code}`)} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <DepotBadge depot={depot} size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Saved Swaps</div>
          <div style={{ fontSize: 10, color: C.m }}>Your bookmarked swaps</div>
        </div>
        <NotifIcon />
        <InboxIcon />
      </div>

      <main id="main-content" tabIndex={-1} style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 90px" }}>
        {swaps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.m }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.m} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 8 }}>No saved swaps</div>
            <div style={{ fontSize: 13, color: C.m }}>Bookmark swaps you&apos;re interested in — they&apos;ll appear here.</div>
            <button onClick={() => router.push(`/depot/${code}/swaps`)} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 12, border: "none", cursor: "pointer", background: C.gold, color: C.bg, fontSize: 13, fontWeight: 700 }}>
              Browse Swaps
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {swaps.map(s => (
              <SwapCard
                key={s.id}
                swap={s}
                user={user}
                onToggleSave={handleToggleSave}
                onClick={() => router.push(`/depot/${code}/swaps/${s.id}`)}
              />
            ))}
          </div>
        )}
        <Footer />
      </main>

      <BottomNav active="browse" depotCode={code} />
      {toast && <Toast message={toast} />}
    </div>
  );
}
