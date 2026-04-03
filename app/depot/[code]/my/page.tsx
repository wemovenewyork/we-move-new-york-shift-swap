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
import BottomNav from "@/components/ui/BottomNav";
import ConfirmModal from "@/components/ui/ConfirmModal";
import NotifIcon from "@/components/ui/NotifIcon";
import InboxIcon from "@/components/ui/InboxIcon";
import Toast from "@/components/ui/Toast";
import Footer from "@/components/ui/Footer";

export default function MyPostsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [depot, setDepot] = useState<Depot | null>(null);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; text: string; action: () => void } | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!code || !user) return;
    api.get<Depot>(`/depots/${code}`).then(setDepot).catch(() => router.replace("/depots"));
    api.get<Swap[]>("/users/me/swaps").then(setSwaps).catch(console.error);
  }, [code, user, router]);

  const handleDelete = (id: string) => {
    setConfirm({ title: "Delete Swap", text: "Are you sure? This cannot be undone.", action: async () => {
      try {
        await api.del(`/swaps/${id}`);
        setSwaps(p => p.filter(s => s.id !== id));
        showToast("Deleted");
      } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Delete failed"); }
      setConfirm(null);
    }});
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await api.put(`/swaps/${id}/status`, { status });
      setSwaps(p => p.map(s => s.id === id ? { ...s, status: status as Swap["status"] } : s));
      showToast("Status updated");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed"); }
  };

  const handleSaveTemplate = (s: Swap) => {
    const tpls = JSON.parse(localStorage.getItem("templates") ?? "[]");
    const name = s.category === "work" ? `Run ${s.run || "?"} - ${s.route || "?"}` : s.category === "daysoff" ? `${s.fromDay || "?"} swap` : `${s.vacationHave || "?"}`;
    tpls.unshift({ ...s, templateName: name });
    localStorage.setItem("templates", JSON.stringify(tpls.slice(0, 10)));
    showToast("Template saved!");
  };

  if (!depot) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.75)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(`/depot/${code}`)} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="back" s={16} /></button>
        <DepotBadge depot={depot} size={38} />
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>My Posts</div>
        <NotifIcon />
        <InboxIcon />
        <button onClick={() => router.push(`/depot/${code}/history`)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>History</button>
      </div>

      <main id="main-content" style={{ maxWidth: 720, margin: "0 auto", padding: "16px 20px 50px" }}>
        {swaps.some(s => s.status === "expired") && (
          <div role="status" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 14, background: "rgba(136,136,136,.08)", border: "1px solid rgba(136,136,136,.2)", marginBottom: 12 }}>
            <Icon n="clk" s={16} c="#888" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>
                {swaps.filter(s => s.status === "expired").length} swap{swaps.filter(s => s.status === "expired").length !== 1 ? "s" : ""} expired
              </div>
              <div style={{ fontSize: 11, color: C.m, marginTop: 2 }}>Tap Edit on any expired swap to repost it.</div>
            </div>
          </div>
        )}
        <div style={{ display: "grid", gap: 8 }}>
          {swaps.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.m }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>No posts yet</div>
              <button onClick={() => router.push(`/depot/${code}/post`)} style={{ marginTop: 14, padding: "10px 22px", borderRadius: 12, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 13, fontWeight: 700, color: C.bg }}>
                Post a Swap
              </button>
            </div>
          ) : swaps.map((s, idx) => (
            <div key={s.id} style={{ animation: `fadeUp .5s cubic-bezier(.4,0,.2,1) ${idx * 0.06}s both` }}>
              <SwapCard swap={s} user={user} onDelete={handleDelete} onStatusChange={handleStatus} onEdit={sw => router.push(`/depot/${code}/post?edit=${sw.id}`)} onSaveTemplate={handleSaveTemplate} />
            </div>
          ))}
          <Footer />
        </div>
      </main>

      <BottomNav active="my" depotCode={code} />
      {confirm && <ConfirmModal title={confirm.title} text={confirm.text} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      {toast && <Toast message={toast} />}
    </div>
  );
}
