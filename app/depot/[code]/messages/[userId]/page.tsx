"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

const formatTime = (d: string) => {
  const date = new Date(d);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " +
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

interface ThreadMessage {
  id: string; text: string; createdAt: string; read: boolean;
  fromUserId: string; toUserId: string;
  fromUser?: { id: string; firstName: string; lastName: string };
  swap?: { id: string; details: string; category: string } | null;
}

interface CounterpartInfo {
  id: string; firstName: string; lastName: string;
}

export default function ThreadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string; userId: string }>();
  const { code, userId: counterpartId } = params;

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [counterpart, setCounterpart] = useState<CounterpartInfo | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clearConvoConfirm, setClearConvoConfirm] = useState(false);
  const [clearingConvo, setClearingConvo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !counterpartId) return;
    api.get<ThreadMessage[]>(`/messages/thread?with=${counterpartId}`).then(msgs => {
      setMessages(msgs);
      // Derive counterpart info from messages
      const cp = msgs.find(m => m.fromUserId === counterpartId)?.fromUser
        ?? msgs.find(m => m.toUserId === counterpartId)?.fromUser;
      if (!cp) {
        // Fallback: try to infer from toUser side via first sent message
        const sent = msgs.find(m => m.fromUserId === user.id);
        if (sent) {
          // We know the counterpart id but not the name — fetch via admin approach not possible
          // Set placeholder
          setCounterpart({ id: counterpartId, firstName: "Operator", lastName: "" });
        }
      } else {
        // fromUser of a received message IS the counterpart
        setCounterpart(cp);
      }
    }).catch(() => router.replace(`/depot/${code}/messages`));
  }, [user, counterpartId, code, router]);

  // Resolve counterpart name properly
  useEffect(() => {
    if (!messages.length || !user) return;
    for (const msg of messages) {
      if (msg.fromUserId === counterpartId && msg.fromUser) {
        setCounterpart(msg.fromUser);
        return;
      }
    }
  }, [messages, counterpartId, user]);

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const newMsg = await api.post<ThreadMessage>(`/users/${counterpartId}/message`, { text: trimmed });
      setMessages(prev => [...prev, newMsg]);
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 1500);
      inputRef.current?.focus();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to send");
    } finally { setSending(false); }
  };

  const clearConversation = async () => {
    setClearingConvo(true);
    try {
      await api.del(`/messages/thread?with=${counterpartId}`);
      setMessages([]);
      setClearConvoConfirm(false);
      showToast("Conversation deleted");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Delete failed");
    } finally { setClearingConvo(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const deleteMessage = async (id: string) => {
    setDeleting(true);
    try {
      await api.del(`/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      setDeleteTarget(null);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Delete failed");
    } finally { setDeleting(false); }
  };

  const counterpartName = counterpart
    ? `${counterpart.firstName}${counterpart.lastName ? " " + counterpart.lastName : ""}`
    : "Loading…";

  const initials = counterpart
    ? (counterpart.firstName[0] ?? "") + (counterpart.lastName?.[0] ?? "")
    : "?";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.9)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(`/depot/${code}/messages`)} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${C.navy},${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.bd}`, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{initials}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{counterpartName}</div>
          <div style={{ fontSize: 10, color: C.m }}>Operator</div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setClearConvoConfirm(true)}
            aria-label="Delete conversation"
            style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid rgba(255,71,87,.3)`, background: "rgba(255,71,87,.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <Icon n="del" s={15} c={C.red} />
          </button>
        )}
      </div>

      {/* Messages */}
      <main id="main-content" style={{ flex: 1, maxWidth: 560, width: "100%", margin: "0 auto", padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.m, fontSize: 13 }}>
            Start the conversation
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.fromUserId === user?.id;
          const showTime = idx === 0 || (new Date(msg.createdAt).getTime() - new Date(messages[idx - 1].createdAt).getTime()) > 5 * 60 * 1000;
          const isTargeted = deleteTarget === msg.id;

          return (
            <div key={msg.id}>
              {showTime && (
                <div style={{ textAlign: "center", fontSize: 10, color: C.m, margin: "8px 0 4px" }}>
                  {formatTime(msg.createdAt)}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", gap: 4 }}>
                <div
                  onClick={() => isMine && setDeleteTarget(isTargeted ? null : msg.id)}
                  style={{
                    maxWidth: "72%",
                    padding: "10px 14px",
                    borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isTargeted
                      ? C.red + "22"
                      : isMine
                        ? `linear-gradient(135deg,${C.gold},${C.gold}cc)`
                        : "rgba(255,255,255,.08)",
                    border: isTargeted ? `1px solid ${C.red}55` : isMine ? "none" : `1px solid ${C.bd}`,
                    fontSize: 14,
                    color: isTargeted ? C.white : isMine ? C.bg : C.white,
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                    cursor: isMine ? "pointer" : "default",
                    transition: "all .15s",
                  }}
                >
                  {msg.text}
                </div>

                {isTargeted && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      onClick={() => setDeleteTarget(null)}
                      style={{ padding: "4px 12px", borderRadius: 8, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      disabled={deleting}
                      style={{ padding: "4px 12px", borderRadius: 8, border: "none", background: C.red, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, opacity: deleting ? 0.6 : 1 }}
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 8 }} />
      </main>

      {/* Reply input */}
      <div style={{ position: "sticky", bottom: 0, background: "rgba(1,0,40,.9)", backdropFilter: "blur(24px)", borderTop: `1px solid ${C.bd}`, padding: "12px 16px", maxWidth: 560, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {/* Quick reply templates */}
        {!text && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
            {["Still available?", "What days work?", "Interested!", "Let's do it!", "Can we talk?"].map(t => (
              <button
                key={t}
                onClick={() => { setText(t); inputRef.current?.focus(); }}
                style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 20, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.05)", color: C.m, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            maxLength={500}
            style={{
              flex: 1, resize: "none", background: "rgba(255,255,255,.06)",
              border: `1px solid ${C.bd}`, borderRadius: 14, padding: "11px 14px",
              fontSize: 14, color: C.white, outline: "none", fontFamily: "inherit",
              lineHeight: 1.4, maxHeight: 120, overflowY: "auto",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending || sent}
            aria-label="Send message"
            style={{
              width: sent ? 88 : 44, height: sent ? 88 : 44, borderRadius: sent ? 20 : 14, border: "none", cursor: "pointer",
              background: sent
                ? "rgba(0,201,167,.18)"
                : text.trim() && !sending
                  ? `linear-gradient(135deg,${C.gold},${C.gold}cc)`
                  : "rgba(255,255,255,.06)",
              color: sent ? "#00C9A7" : text.trim() && !sending ? C.bg : C.m,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all .2s",
            }}
          >
            {sent
              ? <Icon n="chk" s={36} c="#00C9A7" />
              : <Icon n="arr" s={18} c={text.trim() && !sending ? C.bg : C.m} />
            }
          </button>
        </div>
        <div style={{ fontSize: 10, color: text.length > 450 ? C.red : C.m, textAlign: "right", marginTop: 4 }}>
          {text.length}/500
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(1,0,40,.95)", backdropFilter: "blur(16px)", border: `1px solid ${C.bd}`, borderRadius: 14, padding: "10px 18px", fontSize: 13, fontWeight: 600, color: C.white, zIndex: 500 }}>
          {toast}
        </div>
      )}

      {clearConvoConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 20 }} onClick={() => setClearConvoConfirm(false)}>
          <div style={{ background: "rgb(4,3,45)", borderRadius: 20, padding: "24px 20px", maxWidth: 360, width: "100%", border: `1px solid rgba(255,255,255,.08)` }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.white, marginBottom: 8 }}>Delete conversation?</div>
            <div style={{ fontSize: 13, color: C.m, lineHeight: 1.5, marginBottom: 20 }}>
              All messages with {counterpartName} will be permanently deleted. This cannot be undone.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setClearConvoConfirm(false)} style={{ padding: 13, borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
              <button onClick={clearConversation} disabled={clearingConvo} style={{ padding: 13, borderRadius: 12, border: "none", background: C.red, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, opacity: clearingConvo ? 0.6 : 1 }}>
                {clearingConvo ? "Deleting…" : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
