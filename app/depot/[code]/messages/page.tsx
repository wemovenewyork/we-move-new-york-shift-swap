"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Depot } from "@/types";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";
import DepotBadge from "@/components/ui/DepotBadge";
import BottomNav from "@/components/ui/BottomNav";
import Footer from "@/components/ui/Footer";
import NotifIcon from "@/components/ui/NotifIcon";

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
    fromUser?: { id: string; firstName: string; lastName: string };
    swap?: { id: string; details: string; category: string } | null;
  };
  unreadCount: number;
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [depot, setDepot] = useState<Depot | null>(null);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!code || !user) return;
    api.get<Depot>(`/depots/${code}`).then(setDepot).catch(() => router.replace("/depots"));
    api.get<Conversation[]>("/users/me/messages").then(setConvos).catch(console.error);
  }, [code, user, router]);

  const totalUnread = convos.reduce((s, c) => s + c.unreadCount, 0);

  const deleteConvo = async (counterpartId: string) => {
    setDeleting(true);
    try {
      await api.del(`/messages/thread?with=${counterpartId}`);
      setConvos(prev => prev.filter(c => c.counterpartId !== counterpartId));
      setDeleteTarget(null);
    } catch { /* non-fatal */ } finally { setDeleting(false); }
  };

  const clearAll = async () => {
    setClearingAll(true);
    try {
      await Promise.all(convos.map(c => api.del(`/messages/thread?with=${c.counterpartId}`)));
      setConvos([]);
      setClearAllConfirm(false);
    } catch { /* non-fatal */ } finally { setClearingAll(false); }
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
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", gap: 8 }}>
            Messages
            {totalUnread > 0 && (
              <span role="status" aria-label={`${totalUnread} unread`} style={{ background: C.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
                {totalUnread}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.m }}>Operator conversations</div>
        </div>
        <NotifIcon />
        {convos.length > 0 && (
          <button onClick={() => setClearAllConfirm(true)} aria-label="Clear all messages" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid rgba(255,71,87,.3)`, background: "rgba(255,71,87,.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon n="del" s={15} c={C.red} />
          </button>
        )}
      </div>

      <main id="main-content" style={{ maxWidth: 520, margin: "0 auto", padding: "16px 20px 90px" }}>
        {convos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.m }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon n="msg" s={28} c={C.m} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 8 }}>No messages yet</div>
            <div style={{ fontSize: 13, color: C.m }}>Your direct messages with other operators will appear here.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {convos.map((conv, idx) => {
              const isReceived = conv.latestMessage.toUserId === user?.id;
              const hasUnread = conv.unreadCount > 0;
              const initials = conv.counterpart.firstName[0] + conv.counterpart.lastName[0];
              const preview = (isReceived ? "" : "You: ") + conv.latestMessage.text;

              const isTargeted = deleteTarget === conv.counterpartId;
              return (
                <div key={conv.counterpartId} style={{ animation: `fadeUp .4s cubic-bezier(.4,0,.2,1) ${idx * 0.05}s both` }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <button
                      onClick={() => { if (isTargeted) setDeleteTarget(null); else router.push(`/depot/${code}/messages/${conv.counterpartId}`); }}
                      style={{
                        flex: 1, textAlign: "left", border: "none", cursor: "pointer",
                        background: isTargeted ? "rgba(255,71,87,.08)" : hasUnread ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.025)",
                        backdropFilter: "blur(8px)", borderRadius: 14, padding: "14px 16px",
                        boxShadow: isTargeted ? `inset 0 0 0 1px ${C.red}44` : hasUnread ? `inset 0 0 0 1px ${C.gold}33` : "inset 0 0 0 1px rgba(255,255,255,.06)",
                        transition: "all .2s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${C.navy},${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${hasUnread ? C.gold + "55" : C.bd}`, flexShrink: 0, position: "relative" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>{initials}</span>
                          {hasUnread && (
                            <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: C.red, border: "2px solid #010028", fontSize: 9, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                          <p style={{ fontSize: 12, color: hasUnread ? "rgba(255,255,255,.75)" : C.m, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {preview}
                          </p>
                        </div>
                        <Icon n="chev" s={14} c={hasUnread ? C.gold : C.m} />
                      </div>
                    </button>
                    {isTargeted ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button onClick={() => deleteConvo(conv.counterpartId)} disabled={deleting} style={{ flex: 1, padding: "0 14px", borderRadius: 12, border: "none", background: C.red, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, opacity: deleting ? 0.6 : 1 }}>
                          {deleting ? "…" : "Delete"}
                        </button>
                        <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: "0 10px", borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteTarget(conv.counterpartId)} aria-label="Delete conversation" style={{ width: 36, borderRadius: 12, border: `1px solid rgba(255,71,87,.2)`, background: "rgba(255,71,87,.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon n="del" s={14} c={C.red} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Footer />
      </main>

      <BottomNav active="messages" depotCode={code} />

      {clearAllConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 20 }} onClick={() => setClearAllConfirm(false)}>
          <div style={{ background: "rgb(4,3,45)", borderRadius: 20, padding: "24px 20px", maxWidth: 360, width: "100%", border: `1px solid rgba(255,255,255,.08)` }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.white, marginBottom: 8 }}>Clear all messages?</div>
            <div style={{ fontSize: 13, color: C.m, lineHeight: 1.5, marginBottom: 20 }}>
              All {convos.length} conversation{convos.length !== 1 ? "s" : ""} will be permanently deleted. This cannot be undone.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setClearAllConfirm(false)} style={{ padding: 13, borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
              <button onClick={clearAll} disabled={clearingAll} style={{ padding: 13, borderRadius: 12, border: "none", background: C.red, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, opacity: clearingAll ? 0.6 : 1 }}>
                {clearingAll ? "Clearing…" : "Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
