"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post("/feedback", { message: text.trim() });
      setSent(true);
      setTimeout(() => { setSent(false); setOpen(false); setText(""); }, 1500);
    } catch { /* non-fatal */ }
    setSending(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ position: "fixed", bottom: 80, right: 16, zIndex: 200, width: 40, height: 40, borderRadius: "50%", border: `1px solid ${C.bd}`, background: "rgba(1,0,40,.9)", backdropFilter: "blur(12px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.m, boxShadow: "0 4px 16px rgba(0,0,0,.3)" }}
        aria-label="Send feedback"
        title="Send feedback"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={() => setOpen(false)}>
          <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", background: "rgb(6,5,52)", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", border: `1px solid ${C.bd}` }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.white, marginBottom: 4 }}>Send Feedback</div>
            <div style={{ fontSize: 12, color: C.m, marginBottom: 14 }}>Report a bug, suggest a feature, or share a thought.</div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What's on your mind?" rows={4} maxLength={500} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.04)", color: C.white, fontSize: 14, resize: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <button onClick={() => setOpen(false)} style={{ padding: 12, borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", cursor: "pointer", color: C.m, fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={send} disabled={sending || !text.trim()} style={{ padding: 12, borderRadius: 12, border: "none", background: sent ? "#2ED573" : `linear-gradient(135deg,${C.gold},${C.gold}cc)`, cursor: "pointer", color: sent ? "#fff" : C.bg, fontSize: 13, fontWeight: 700, opacity: sending ? 0.7 : 1 }}>
                {sent ? "Sent ✓" : sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
