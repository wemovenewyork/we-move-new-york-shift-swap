"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
};

interface Conversation {
  counterpartId: string;
  counterpart: { id: string; firstName: string; lastName: string };
  latestMessage: {
    id: string; text: string; createdAt: string; read: boolean;
    fromUserId: string; toUserId: string;
  };
  unreadCount: number;
}

export default function InboxPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const load = useCallback(() => {
    api.get<Conversation[]>("/users/me/messages")
      .then(setConvos)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const interval = setInterval(load, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [user, load]);

  const depotCode = user?.depot?.code;
  const totalUnread = convos.reduce((s, c) => s + c.unreadCount, 0);

  const openThread = (counterpartId: string) => {
    if (depotCode) {
      router.push(`/depot/${depotCode}/messages/${counterpartId}`);
    }
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
          <Icon n="msg" s={18} c={C.gold} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", gap: 8 }}>
            Inbox
            {totalUnread > 0 && (
              <span role="status" aria-label={`${totalUnread} unread`} style={{ background: C.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
                {totalUnread}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.m }}>
            {convos.length > 0 ? `${convos.length} conversation${convos.length !== 1 ? "s" : ""}` : "No messages yet"}
          </div>
        </div>
      </div>

      <main id="main-content" style={{ maxWidth: 520, margin: "0 auto", padding: "16px 20px 40px" }}>
        {fetching ? (
          /* Skeleton */
          <div style={{ display: "grid", gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 76, borderRadius: 14, background: "rgba(255,255,255,.04)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : convos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.m }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Icon n="msg" s={32} c={C.m} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 8 }}>No messages yet</div>
            <div style={{ fontSize: 13, color: C.m, lineHeight: 1.6 }}>
              Your direct messages with other operators<br />will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {convos.map((conv, idx) => {
              const isReceived = conv.latestMessage.toUserId === user.id;
              const initials = (conv.counterpart.firstName[0] ?? "") + (conv.counterpart.lastName[0] ?? "");
              const preview = (isReceived ? "" : "You: ") + conv.latestMessage.text;
              const hasUnread = conv.unreadCount > 0;

              return (
                <button
                  key={conv.counterpartId}
                  onClick={() => openThread(conv.counterpartId)}
                  disabled={!depotCode}
                  style={{
                    width: "100%", textAlign: "left", border: "none", cursor: depotCode ? "pointer" : "default",
                    animation: `fadeUp .35s cubic-bezier(.4,0,.2,1) ${idx * 0.05}s both`,
                    background: hasUnread ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.025)",
                    backdropFilter: "blur(8px)", borderRadius: 14, padding: "14px 16px",
                    boxShadow: hasUnread
                      ? `inset 0 0 0 1px ${C.gold}33`
                      : "inset 0 0 0 1px rgba(255,255,255,.06)",
                    transition: "all .2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Avatar */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: "50%",
                        background: `linear-gradient(135deg,${C.navy},${C.blue})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `2px solid ${hasUnread ? C.gold + "55" : C.bd}`,
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>{initials}</span>
                      </div>
                      {hasUnread && (
                        <span style={{
                          position: "absolute", top: -2, right: -2, width: 18, height: 18,
                          borderRadius: "50%", background: C.red, border: "2px solid #010028",
                          fontSize: 9, fontWeight: 700, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: hasUnread ? 700 : 600, color: C.white }}>
                          {conv.counterpart.firstName} {conv.counterpart.lastName}
                        </span>
                        <span style={{ fontSize: 11, color: C.m, flexShrink: 0, marginLeft: 8 }}>
                          {timeAgo(conv.latestMessage.createdAt)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 12, margin: 0,
                        color: hasUnread ? "rgba(255,255,255,.8)" : C.m,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {preview}
                      </p>
                    </div>

                    <Icon n="chev" s={14} c={hasUnread ? C.gold : C.m} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
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
