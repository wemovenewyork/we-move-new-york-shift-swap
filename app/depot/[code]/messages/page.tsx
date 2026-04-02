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

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!code || !user) return;
    api.get<Depot>(`/depots/${code}`).then(setDepot).catch(() => router.replace("/depots"));
    api.get<Conversation[]>("/users/me/messages").then(setConvos).catch(console.error);
  }, [code, user, router]);

  const totalUnread = convos.reduce((s, c) => s + c.unreadCount, 0);

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

              return (
                <button
                  key={conv.counterpartId}
                  onClick={() => router.push(`/depot/${code}/messages/${conv.counterpartId}`)}
                  style={{
                    width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                    animation: `fadeUp .4s cubic-bezier(.4,0,.2,1) ${idx * 0.05}s both`,
                    background: hasUnread ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.025)",
                    backdropFilter: "blur(8px)", borderRadius: 14, padding: "14px 16px",
                    boxShadow: hasUnread
                      ? `inset 0 0 0 1px ${C.gold}33`
                      : "inset 0 0 0 1px rgba(255,255,255,.06)",
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
