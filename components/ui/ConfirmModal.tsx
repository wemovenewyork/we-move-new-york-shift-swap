"use client";

import { useId } from "react";
import { C } from "@/constants/colors";
import FocusTrap from "./FocusTrap";

interface Props {
  title: string;
  text: string;
  confirmLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, text, confirmLabel = "Delete", confirmColor = C.red, onConfirm, onCancel }: Props) {
  const titleId = useId();
  return (
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onCancel}
    >
      <FocusTrap
        onEscape={onCancel}
        role="alertdialog"
        aria-modal={true}
        aria-labelledby={titleId}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ background: "rgba(1,0,40,.95)", backdropFilter: "blur(24px)", borderRadius: 24, border: "1px solid rgba(255,255,255,.08)", padding: 28, maxWidth: 360, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,.6)", animation: "fadeUp .3s ease" }}
      >
        <h3 id={titleId} style={{ fontSize: 18, fontWeight: 800, color: C.white, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: C.m, lineHeight: 1.5, marginBottom: 20 }}>{text}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={onCancel} style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: 14, borderRadius: 12, border: "none", cursor: "pointer", background: confirmColor, fontSize: 14, fontWeight: 700, color: "#fff" }}>{confirmLabel}</button>
        </div>
      </FocusTrap>
    </div>
  );
}
