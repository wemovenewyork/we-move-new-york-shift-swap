"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Message, Depot } from "@/types";
import { C, CM } from "@/constants/colors";
import Icon from "@/components/ui/Icon";
import DepotBadge from "@/components/ui/DepotBadge";
import BottomNav from "@/components/ui/BottomNav";
import Footer from "@/components/ui/Footer";

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
};

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [depot, setDepot] = useState<Depot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.put(`/messages/${id}/read`, {});
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    } catch {}
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!code || !user) return;
    api.get<Depot>(`/depots/${code}`).then(setDepot).catch(() => router.replace("/depots"));
    api.get<Message[]>("/users/me/messages").then(setMessages).catch(console.error);
  }, [code, user, router]);

  const handleExpand = (id: string) => {
    setExpanded(prev => prev === id ? null : id);
    const msg = messages.find(m => m.id === id);
    if (msg && !msg.read) markRead(id);
  };

  const unread = messages.filter(m => !m.read).length;

  if (!depot) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.8)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(`/depot/${code}`)} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <DepotBadge depot={depot} size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white, display: "flex", alignItems: "center", gap: 8 }}>
            Messages
            {unread > 0 && (
              <span role="status" aria-label={`${unread} unread messages`} style={{ background: C.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, minWidth: 20, textAlign: "center" }}>
                {unread}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.m }}>Interest in your swaps</div>
        </div>
      </div>

      <main id="main-content" style={{ maxWidth: 520, margin: "0 auto", padding: "16px 20px 90px" }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.m }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.bd}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon n="msg" s={28} c={C.m} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 8 }}>No messages yet</div>
            <div style={{ fontSize: 13, color: C.m }}>When someone is interested in your swap, they&apos;ll message you here.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {messages.map((msg, idx) => {
              const m = CM[msg.swap?.category as keyof typeof CM] ?? CM.work;
              const isOpen = expanded === msg.id;
              const senderName = msg.fromUser ? `${msg.fromUser.firstName} ${msg.fromUser.lastName}` : "Someone";

              return (
                <button
                  key={msg.id}
                  onClick={() => handleExpand(msg.id)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                    animation: `fadeUp .4s cubic-bezier(.4,0,.2,1) ${idx * 0.05}s both`,
                    background: msg.read ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.05)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 14,
                    padding: "16px",
                    boxShadow: msg.read
                      ? "inset 0 0 0 1px rgba(255,255,255,.06)"
                      : `inset 0 0 0 1px ${m.c}33`,
                    transition: "all .2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    {/* Avatar */}
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${C.navy},${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${msg.read ? C.bd : m.c + "55"}`, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>
                        {senderName.split(" ").map(w => w[0]).join("").substring(0, 2)}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{senderName}</span>
                          {!msg.read && (
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.c, display: "inline-block", flexShrink: 0 }} aria-hidden="true" />
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: C.m, flexShrink: 0 }}>{timeAgo(msg.createdAt)}</span>
                      </div>

                      {msg.swap && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: m.c, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{msg.swap.category}</span>
                          <span style={{ fontSize: 10, color: C.m }}>·</span>
                          <span style={{ fontSize: 11, color: C.m, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                            {msg.swap.details}
                          </span>
                        </div>
                      )}

                      <p style={{ fontSize: 13, color: isOpen ? "rgba(255,255,255,.85)" : C.m, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isOpen ? "normal" : "nowrap", lineHeight: 1.5 }}>
                        {msg.text}
                      </p>

                      {isOpen && msg.swap && (
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/depot/${code}/swaps/${msg.swap!.id}`); }}
                          style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, border: `1px solid ${m.c}44`, background: m.c + "12", color: m.c, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                        >
                          View Swap <Icon n="chev" s={12} c={m.c} />
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <Footer />
      </main>

      <BottomNav active="messages" depotCode={code} />
    </div>
  );
}
