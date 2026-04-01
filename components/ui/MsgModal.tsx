"use client";

import { useState } from "react";
import { Swap } from "@/types";
import { C } from "@/constants/colors";
import Icon from "./Icon";

interface Props {
  swap: Swap;
  onSend: (swap: Swap, text: string) => void;
  onClose: () => void;
}

export default function MsgModal({ swap, onSend, onClose }: Props) {
  const [text, setText] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "rgba(1,0,40,.95)", backdropFilter: "blur(24px)", borderRadius: 24, border: "1px solid rgba(255,255,255,.08)", padding: 28, maxWidth: 400, width: "100%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.6)", animation: "fadeUp .3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.white }}>Send Message</h3>
          <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="back" s={14} /></button>
        </div>
        <div style={{ background: C.s, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, marginBottom: 4 }}>To: {swap.posterName}</div>
          <div style={{ fontSize: 11, color: C.m }}>{swap.details.substring(0, 60)}{swap.details.length > 60 ? "..." : ""}</div>
          {swap.contact && <div style={{ fontSize: 11, color: C.m, marginTop: 4 }}>Contact: {swap.contact}</div>}
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Hi, I'm interested in your swap..." rows={4} style={{ resize: "vertical", marginBottom: 16, width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "14px 18px", fontSize: 16, color: C.white, outline: "none", fontFamily: "inherit" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={onClose} style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
          <button onClick={() => { if (text.trim()) onSend(swap, text.trim()); }} style={{ padding: 14, borderRadius: 12, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 14, fontWeight: 700, color: C.bg, opacity: text.trim() ? 1 : 0.4 }}>Send</button>
        </div>
      </div>
    </div>
  );
}
