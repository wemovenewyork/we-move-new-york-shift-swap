"use client";
import { useEffect } from "react";
import { C } from "@/constants/colors";
import { playChime } from "@/lib/sound";

interface Props {
  onDismiss: () => void;
}

export default function FirstSwapCelebration({ onDismiss }: Props) {
  useEffect(() => {
    playChime();
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        animation: "fadeIn .3s ease",
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
      <div style={{
        background: "rgba(10,8,30,.97)",
        border: `1px solid ${C.gold}44`,
        borderRadius: 24,
        padding: "40px 48px",
        textAlign: "center",
        maxWidth: 320,
        boxShadow: `0 0 60px ${C.gold}22`,
        animation: "popIn .4s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 8 }}>
          First swap posted!
        </div>
        <div style={{ fontSize: 14, color: C.m, lineHeight: 1.6 }}>
          Your swap is now live. Other operators in your depot can see it and reach out.
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,.3)" }}>
          Tap anywhere to continue
        </div>
      </div>
    </div>
  );
}
