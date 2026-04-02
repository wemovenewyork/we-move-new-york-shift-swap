"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C, CM } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

const PURPLE = "#C084FC";

interface Stats {
  totalUsers: number; totalSwaps: number; openSwaps: number;
  pendingReports: number; totalDepots: number; completedAgreements: number;
}

interface Report {
  id: string; reason: string | null; createdAt: string;
  swap: { id: string; details: string; category: string; posterName: string; depot: { name: string; code: string } };
  reporter: { id: string; firstName: string; lastName: string };
}

interface AdminUser {
  id: string; firstName: string; lastName: string; email: string;
  role: "operator" | "depotRep" | "admin"; createdAt: string;
  depot: { name: string; code: string } | null;
}

const ROLE_COLORS: Record<string, string> = {
  operator: C.blue, depotRep: C.gold, admin: PURPLE,
};

const lb: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: C.m, letterSpacing: 2, textTransform: "uppercase" };

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"reports" | "users">("reports");
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQ, setUserQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "admin") router.replace("/depots");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    api.get<Stats>("/admin/stats").then(setStats).catch(() => {});
    api.get<Report[]>("/admin/reports").then(setReports).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (tab !== "users" || !user || user.role !== "admin") return;
    api.get<AdminUser[]>(`/admin/users${userQ ? `?q=${encodeURIComponent(userQ)}` : ""}`).then(setUsers).catch(() => {});
  }, [tab, userQ, user]);

  const handleReport = async (reportId: string, action: "dismiss" | "remove") => {
    setBusy(reportId);
    try {
      await api.patch("/admin/reports", { reportId, action });
      setReports(prev => prev.filter(r => r.id !== reportId));
      if (stats) setStats({ ...stats, pendingReports: stats.pendingReports - 1 });
      showToast(action === "remove" ? "Swap removed" : "Report dismissed");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Action failed");
    } finally { setBusy(null); }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setBusy(userId);
    try {
      await api.patch("/admin/users", { userId, role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as AdminUser["role"] } : u));
      showToast("Role updated");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to update role");
    } finally { setBusy(null); }
  };

  if (!user || user.role !== "admin") return null;

  const statCards = stats ? [
    { l: "Users", v: stats.totalUsers, c: C.blue },
    { l: "Depots", v: stats.totalDepots, c: C.gold },
    { l: "Total Swaps", v: stats.totalSwaps, c: "#00C9A7" },
    { l: "Open Swaps", v: stats.openSwaps, c: "#2ED573" },
    { l: "Agreements", v: stats.completedAgreements, c: PURPLE },
    { l: "Reports", v: stats.pendingReports, c: stats.pendingReports > 0 ? C.red : C.m },
  ] : [];

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.9)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/depots")} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.white }}>Admin Dashboard</div>
          <div style={{ fontSize: 10, color: PURPLE, letterSpacing: 2, textTransform: "uppercase" }}>System Overview</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: PURPLE + "18", border: `1px solid ${PURPLE}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="shield" s={18} c={PURPLE} />
        </div>
      </div>

      <main id="main-content" style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px" }}>
        {/* Stats grid */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
            {statCards.map(s => (
              <div key={s.l} style={{ padding: "12px 10px", borderRadius: 14, background: s.c + "12", border: `1px solid ${s.c}22`, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, background: C.s, borderRadius: 12, padding: 4, marginBottom: 16 }}>
          {(["reports", "users"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: tab === t ? PURPLE + "22" : "transparent", color: tab === t ? PURPLE : C.m, boxShadow: tab === t ? `inset 0 0 0 1px ${PURPLE}44` : "none" }}>
              {t === "reports" ? `Reports${stats?.pendingReports ? ` (${stats.pendingReports})` : ""}` : "Users"}
            </button>
          ))}
        </div>

        {/* Reports tab */}
        {tab === "reports" && (
          <div style={{ display: "grid", gap: 10 }}>
            {reports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: C.m }}>
                <Icon n="chk" s={36} c="#2ED573" />
                <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginTop: 12 }}>No pending reports</div>
                <div style={{ fontSize: 12, color: C.m, marginTop: 6 }}>All clear across all depots.</div>
              </div>
            ) : reports.map(r => {
              const colors = CM[r.swap.category as keyof typeof CM] ?? CM.work;
              const isBusy = busy === r.id;
              return (
                <div key={r.id} style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, border: `1px solid ${C.red}22`, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: colors.c, textTransform: "uppercase", letterSpacing: 1 }}>{r.swap.category}</span>
                        <span style={{ fontSize: 10, color: C.m }}>·</span>
                        <span style={{ fontSize: 10, color: C.m }}>{r.swap.depot.name}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 4 }}>
                        {r.swap.posterName} — {r.swap.details.substring(0, 80)}{r.swap.details.length > 80 ? "…" : ""}
                      </div>
                      <div style={{ fontSize: 11, color: C.m }}>
                        Reported by {r.reporter.firstName} {r.reporter.lastName}
                        {r.reason ? ` · "${r.reason}"` : ""} · {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => handleReport(r.id, "dismiss")} disabled={isBusy} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 12, fontWeight: 600, opacity: isBusy ? 0.5 : 1 }}>
                      Dismiss
                    </button>
                    <button onClick={() => handleReport(r.id, "remove")} disabled={isBusy} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.red}44`, background: C.red + "12", color: C.red, cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: isBusy ? 0.5 : 1 }}>
                      Remove Swap
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="admin-user-search" style={lb}>Search Users</label>
              <input id="admin-user-search" value={userQ} onChange={e => setUserQ(e.target.value)} placeholder="Name or email..." style={{ height: 44 }} />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {users.map(u => {
                const rc = ROLE_COLORS[u.role] ?? C.m;
                const isBusy = busy === u.id;
                return (
                  <div key={u.id} style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, border: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: rc + "18", border: `1px solid ${rc}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: rc, flexShrink: 0 }}>
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: 11, color: C.m, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      {u.depot && <div style={{ fontSize: 10, color: C.gold, marginTop: 2 }}>{u.depot.name}</div>}
                    </div>
                    <select
                      value={u.role}
                      disabled={isBusy}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${rc}44`, background: rc + "12", color: rc, fontSize: 12, fontWeight: 700, cursor: "pointer", appearance: "auto", opacity: isBusy ? 0.5 : 1 }}
                    >
                      <option value="operator">Operator</option>
                      <option value="depotRep">Depot Rep</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                );
              })}
              {users.length === 0 && userQ && (
                <div style={{ textAlign: "center", padding: "32px 20px", color: C.m, fontSize: 13 }}>No users found</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(1,0,40,.95)", backdropFilter: "blur(16px)", border: `1px solid ${C.bd}`, borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 600, color: C.white, zIndex: 500, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
