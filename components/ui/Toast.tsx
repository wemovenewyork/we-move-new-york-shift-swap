"use client";

import Icon from "./Icon";
import { C } from "@/constants/colors";

export default function Toast({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
        zIndex: 300, padding: "12px 20px", borderRadius: 14,
        background: "rgba(1,0,40,.9)", backdropFilter: "blur(20px)",
        borderLeft: "4px solid " + C.gold, color: C.white, fontSize: 14,
        fontWeight: 600, animation: "toastIn .4s ease",
        display: "flex", alignItems: "center", gap: 8,
        whiteSpace: "nowrap",
      }}
    >
      <Icon n="chk" s={16} c={C.gold} />
      {message}
    </div>
  );
}
