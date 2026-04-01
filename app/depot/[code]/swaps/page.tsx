"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Depot, Swap } from "@/types";
import { C, CM, SWAP_TYPES } from "@/constants/colors";
import SwapCard from "@/components/ui/SwapCard";
import DepotBadge from "@/components/ui/DepotBadge";
import MsgModal from "@/components/ui/MsgModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import BottomNav from "@/components/ui/BottomNav";
import FAB from "@/components/ui/FAB";
import Toast from "@/components/ui/Toast";
import Icon from "@/components/ui/Icon";
import Footer from "@/components/ui/Footer";

export default function BrowsePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [depot, setDepot] = useState<Depot | null>(null);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [msgModal, setMsgModal] = useState<Swap | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; text: string; action: () => void } | null>(null);
  const [lastVisit] = useState(() => Date.now());

  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sf, setSf] = useState("open");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [quickF, setQuickF] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!code || !user) return;
    api.get<Depot>(`/depots/${code}`).then(setDepot).catch(() => router.replace("/depots"));
    fetchSwaps();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, user]);

  const fetchSwaps = async () => {
    if (!user) return;
    const params = new URLSearchParams();
    if (cat !== "all") params.set("category", cat);
    if (sf !== "all") params.set("status", sf);
    if (q) params.set("search", q);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("sort", sortBy);
    try {
      const data = await api.get<Swap[]>(`/swaps?${params}`);
      setSwaps(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (user) fetchSwaps(); }, [cat, sf, q, dateFrom, dateTo, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let r = [...swaps];
    if (quickF === "am") r = r.filter(s => s.startTime && parseInt(s.startTime) < 12);
    if (quickF === "pm") r = r.filter(s => s.startTime && parseInt(s.startTime) >= 12);
    if (quickF === "weekend") r = r.filter(s => s.fromDay === "Saturday" || s.fromDay === "Sunday" || s.toDay === "Saturday" || s.toDay === "Sunday" || (s.date && [0,6].includes(new Date(s.date + "T12:00").getDay())));
    if (quickF === "thisweek") {
      const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
      const we = weekEnd.toISOString().split("T")[0];
      r = r.filter(s => s.date && s.date <= we);
    }
    return r;
  }, [swaps, quickF]);

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

  const handleReport = (s: Swap) => {
    setConfirm({ title: "Report Swap", text: "Report this swap as inappropriate or spam?", action: async () => {
      try {
        await api.post(`/swaps/${s.id}/report`, {});
        showToast("Reported. Thank you.");
      } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Report failed"); }
      setConfirm(null);
    }});
  };

  const handleSend = async (swap: Swap, text: string) => {
    try {
      await api.post(`/swaps/${swap.id}/interest`, { text });
      showToast("Message sent!");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Send failed"); }
    setMsgModal(null);
  };

  if (!depot) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.75)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(`/depot/${code}`)} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="back" s={16} /></button>
        <DepotBadge depot={depot} size={38} />
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>{depot.name}</div>
        <button onClick={() => router.push(`/depot/${code}/post`)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: "#D1AD38", fontSize: 13, fontWeight: 700, color: "#010028", flexShrink: 0 }}>+ Post</button>
      </div>

      <main id="main-content" style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, background: `linear-gradient(135deg,${C.white},${C.gold}88)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", padding: "18px 0 8px" }}>Available Swaps</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." style={{ height: 40, fontSize: 13, flex: 1 }} />
          <select value={sf} onChange={e => setSf(e.target.value)} style={{ width: "auto", padding: "8px 10px", borderRadius: 14, fontSize: 11, fontWeight: 600, appearance: "auto", cursor: "pointer", background: C.s, border: `1px solid ${C.bd}`, color: C.white }}>
            <option value="all">All</option><option value="open">Open</option><option value="pending">Pending</option><option value="filled">Filled</option><option value="expired">Expired</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)} style={{ padding: "8px 12px", borderRadius: 14, border: `1px solid ${showFilters ? C.gold + "44" : C.bd}`, background: showFilters ? C.gs : C.s, cursor: "pointer", color: showFilters ? C.gold : C.m, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            <Icon n="tmr" s={12} /> Filters
          </button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: "auto", padding: "8px 10px", borderRadius: 14, fontSize: 11, fontWeight: 600, appearance: "auto", cursor: "pointer", background: C.s, border: `1px solid ${C.bd}`, color: C.white }}>
            <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="date">By Date</option>
          </select>
        </div>

        {showFilters && (
          <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.m, flexShrink: 0 }}>Date:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ height: 36, fontSize: 12, flex: 1, padding: "8px 12px" }} />
            <span style={{ fontSize: 11, color: C.m }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ height: 36, fontSize: 12, flex: 1, padding: "8px 12px" }} />
            {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", fontSize: 10, flexShrink: 0 }}>Clear</button>}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
          {SWAP_TYPES.map(x => {
            const m = CM[x.id as keyof typeof CM];
            const ct = swaps.filter(s => s.category === x.id).length;
            return (
              <button key={x.id} onClick={() => setCat(cat === x.id ? "all" : x.id)} style={{ padding: "12px 10px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", background: cat === x.id ? m.bg : "rgba(255,255,255,.025)", backdropFilter: "blur(8px)", boxShadow: cat === x.id ? `inset 0 0 0 1.5px ${m.bd2}, 0 0 12px ${m.c}10` : `inset 0 0 0 1px rgba(255,255,255,.05)` }}>
                <Icon n={x.ic} s={18} c={cat === x.id ? m.c : C.m} />
                <div style={{ fontSize: 11, fontWeight: 700, color: cat === x.id ? m.c : C.white, marginTop: 4 }}>{x.l}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: cat === x.id ? m.c : C.m }}>{ct}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
          {[{ k: "", l: "All" }, { k: "am", l: "AM Shifts" }, { k: "pm", l: "PM Shifts" }, { k: "weekend", l: "Weekend" }, { k: "thisweek", l: "This Week" }].map(f => (
            <button key={f.k} onClick={() => setQuickF(quickF === f.k ? "" : f.k)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, background: quickF === f.k ? C.gold : C.s, color: quickF === f.k ? C.bg : C.m }}>{f.l}</button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8, paddingBottom: 80 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.m }}>No swaps found</div>
          ) : filtered.map((s, idx) => (
            <div key={s.id} style={{ animation: `fadeUp .5s cubic-bezier(.4,0,.2,1) ${idx * 0.06}s both` }}>
              <SwapCard
                swap={s}
                user={user}
                onDelete={handleDelete}
                onStatusChange={handleStatus}
                onInterest={s.status === "open" ? setMsgModal : undefined}
                onEdit={s.userId === user?.id ? (sw) => router.push(`/depot/${code}/post?edit=${sw.id}`) : undefined}
                onReport={handleReport}
                lastVisit={lastVisit}
                onClick={s.status === "open" ? () => router.push(`/depot/${code}/swaps/${s.id}`) : undefined}
              />
            </div>
          ))}
        </div>
        <Footer />
      </main>

      <FAB onClick={() => router.push(`/depot/${code}/post`)} />
      <BottomNav active="browse" depotCode={code} />
      {msgModal && <MsgModal swap={msgModal} onSend={handleSend} onClose={() => setMsgModal(null)} />}
      {confirm && <ConfirmModal title={confirm.title} text={confirm.text} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      {toast && <Toast message={toast} />}
    </div>
  );
}
