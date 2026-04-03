"use client";

import { useId, useState } from "react";
import { Swap } from "@/types";
import { C } from "@/constants/colors";
import Icon from "./Icon";
import FocusTrap from "./FocusTrap";

interface Props {
  swap: Swap;
  onSend: (swap: Swap, text: string) => void;
  onClose: () => void;
}

export default function MsgModal({ swap, onSend, onClose }: Props) {
  const titleId = useId();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await onSend(swap, text.trim());
    setSending(false);
  };

  return (
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <FocusTrap
        onEscape={onClose}
        role="dialog"
        aria-modal={true}
        aria-labelledby={titleId}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ background: "rgb(4,3,45)", backdropFilter: "blur(24px)", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,.08)", padding: "24px 20px 40px", maxWidth: 480, width: "100%", boxShadow: "0 -24px 80px rgba(0,0,0,.5)", animation: "fadeUp .3s ease" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 id={titleId} style={{ fontSize: 17, fontWeight: 800, color: C.white, margin: 0 }}>
            Message {swap.posterName.split(" ")[0]}
          </h3>
          <button onClick={onClose} aria-label="Close dialog" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="back" s={14} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: C.m, marginBottom: 20 }}>
          Send a message before committing — ask questions or share your schedule.
        </div>

        <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
            {swap.category === "work" ? "Work Swap" : swap.category === "daysoff" ? "Days Off Swap" : "Vacation Swap"}
          </div>
          <div style={{ fontSize: 12, color: C.m, lineHeight: 1.5 }}>{swap.details.substring(0, 80)}{swap.details.length > 80 ? "…" : ""}</div>
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. My run is 42, route M15, start 6am — does that work?"
          rows={4}
          maxLength={500}
          style={{ width: "100%", background: "rgba(255,255,255,.05)", border: `1px solid rgba(255,255,255,.1)`, borderRadius: 12, padding: "12px 14px", fontSize: 14, color: C.white, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
        />
        <div style={{ fontSize: 10, color: text.length > 450 ? C.red : C.m, textAlign: "right", marginBottom: 14 }}>{text.length}/500</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <button onClick={onClose} style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{ padding: 14, borderRadius: 12, border: "none", cursor: text.trim() && !sending ? "pointer" : "not-allowed", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 14, fontWeight: 700, color: C.bg, opacity: text.trim() && !sending ? 1 : 0.4 }}
          >
            {sending ? "Sending…" : "Send Message"}
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}
