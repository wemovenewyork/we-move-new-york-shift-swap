"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
}

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 86400 * 7) return Math.floor(s / 86400) + "d ago";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const iconForTitle = (title: string): string => {
  const t = title.toLowerCase();
  if (t.includes("message")) return "msg";
  if (t.includes("swap") && t.includes("fill")) return "chk";
  if (t.includes("expir")) return "tmr";
  if (t.includes("match")) return "match";
  if (t.includes("swap")) return "swap";
  return "bell";
};

const colorForTitle = (title: string): string => {
  const t = title.toLowerCase();
  if (t.includes("message")) return "#C084FC";
  if (t.includes("fill")) return "#2ED573";
  if (t.includes("expir")) return "#FF4757";
  if (t.includes("match")) return "#F59E0B";
  if (t.includes("swap")) return C.gold;
  return C.m;
};

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const load = useCallback(() => {
    api.get<{ notifications: AppNotification[]; unreadCount: number }>("/notifications")
      .then(d => { setNotifs(d.notifications); setUnread(d.unreadCount); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  const markAllRead = async () => {
    if (unread === 0 || markingRead) return;
    setMarkingRead(true);
    try {
      await api.put("/notifications/read-all", {});
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* non-fatal */ } finally {
      setMarkingRead(false);
    }
  };

  const handleClick = (n: AppNotification) => {
    if (!n.read) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
      api.patch(`/notifications/${n.id}`, {}).catch(() => {});
    }
    if (n.url) router.push(n.url);
  };

  if (loading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(1,0,40,.85)", backdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.bd}`, padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <Icon n="back" s={16} />
        </button>

        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.gold + "15", border: `1px solid ${C.gold}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon n="bell" s={18} c={C.gold} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", gap: 8 }}>
            Notifications
            {unread > 0 && (
              <span role="status" style={{ background: C.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
                {unread}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.m }}>
            {notifs.length > 0 ? `${notifs.length} notification${notifs.length !== 1 ? "s" : ""}` : "All caught up"}
          </div>
        </div>

        {unread > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingRead}
            style={{ fontSize: 11, fontWeight: 600, color: C.gold, background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px", opacity: markingRead ? 0.5 : 1 }}
          >
            Mark all read
          </button>
        )}
      </div>

      <main id="main-content" style={{ maxWidth: 520, margin: "0 auto", padding: "16px 20px 40px" }}>
        {fetching ? (
          <div style={{ display: "grid", gap: 8 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 68, borderRadius: 14, background: "rgba(255,255,255,.04)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Icon n="bell" s={32} c={C.m} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 8 }}>You&apos;re all caught up</div>
            <div style={{ fontSize: 13, color: C.m, lineHeight: 1.6 }}>
              Swap activity, messages, and alerts<br />will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {notifs.map((n, idx) => {
              const ic = iconForTitle(n.title);
              const cl = colorForTitle(n.title);
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    width: "100%", textAlign: "left", border: "none", cursor: n.url ? "pointer" : "default",
                    animation: `fadeUp .3s cubic-bezier(.4,0,.2,1) ${idx * 0.04}s both`,
                    background: n.read ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.06)",
                    borderRadius: 14, padding: "13px 16px",
                    boxShadow: n.read
                      ? "inset 0 0 0 1px rgba(255,255,255,.06)"
                      : `inset 0 0 0 1px ${cl}33`,
                    transition: "background .2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0, marginTop: 1,
                      background: cl + "18", border: `1px solid ${cl}33`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon n={ic} s={16} c={cl} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: n.read ? 600 : 700, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.title}
                        </span>
                        <span style={{ fontSize: 10, color: C.m, flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: n.read ? C.m : "rgba(255,255,255,.7)", margin: 0, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.body}
                      </p>
                    </div>

                    {!n.read && (
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, flexShrink: 0, marginTop: 6 }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
