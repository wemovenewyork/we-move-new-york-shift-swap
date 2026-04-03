"use client";

import { C } from "@/constants/colors";

interface ToastProps { message: string; type?: "success" | "error" | "info"; }

export default function Toast({ message, type = "success" }: ToastProps) {
  const styles = {
    success: {
      background: "rgba(1,0,40,.9)",
      borderColor: C.gold,
      iconColor: C.gold,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    error: {
      background: "rgba(255,71,87,.15)",
      borderColor: "rgba(255,71,87,.3)",
      iconColor: "#FF4757",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF4757" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
    },
    info: {
      background: "rgba(2,73,181,.15)",
      borderColor: "rgba(2,73,181,.3)",
      iconColor: "#0249B5",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0249B5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="8" strokeWidth="3" strokeLinecap="round" /><line x1="12" y1="12" x2="12" y2="16" />
        </svg>
      ),
    },
  };

  const s = styles[type];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
        zIndex: 300, padding: "12px 20px", borderRadius: 14,
        background: s.background, backdropFilter: "blur(20px)",
        borderLeft: "4px solid " + s.borderColor, color: C.white, fontSize: 14,
        fontWeight: 600, animation: "toastIn .4s ease",
        display: "flex", alignItems: "center", gap: 8,
        whiteSpace: "nowrap",
      }}
    >
      {s.icon}
      {message}
    </div>
  );
}
