"use client";

import { useState } from "react";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

const STEPS = [
  {
    icon: "swap",
    color: C.gold,
    title: "Welcome to Shift Swap",
    body: "The easiest way for MTA operators to swap work days, days off, and vacation weeks — without waiting on management.",
  },
  {
    icon: "edit",
    color: C.blue,
    title: "Post Your Swap",
    body: "Choose a swap type — work day, days off, or vacation week. Add the date and shift details so other operators know exactly what you're offering.",
  },
  {
    icon: "match",
    color: "#00C9A7",
    title: "Find a Match",
    body: "Browse your depot's board. See a swap that works? Message the operator directly to express interest.",
  },
  {
    icon: "shield",
    color: "#C084FC",
    title: "Make It Official",
    body: "Agree to the swap. Both operators confirm — creating a timestamped record you can take to your dispatcher or union rep.",
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  const next = () => {
    if (isLast) { onDone(); return; }
    setStep(v => v + 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App onboarding"
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(1,0,40,.97)", backdropFilter: "blur(24px)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "40px 32px",
      }}
    >
      {/* Step dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 48 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 6, height: 6, borderRadius: 3,
            background: i === step ? C.gold : "rgba(255,255,255,.15)",
            transition: "all .3s ease",
          }} />
        ))}
      </div>

      {/* Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: s.color + "14", border: `1.5px solid ${s.color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 28,
        animation: "fadeUp .4s ease both",
      }}>
        <Icon n={s.icon} s={32} c={s.color} />
      </div>

      {/* Text */}
      <div style={{ textAlign: "center", maxWidth: 320, animation: "fadeUp .4s ease .05s both" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 12, lineHeight: 1.2 }}>
          {s.title}
        </h2>
        <p style={{ fontSize: 15, color: C.m, lineHeight: 1.65 }}>
          {s.body}
        </p>
      </div>

      {/* Buttons */}
      <div style={{ position: "absolute", bottom: 48, left: 32, right: 32, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <button
          onClick={next}
          style={{
            width: "100%", maxWidth: 320, padding: 16, borderRadius: 16, border: "none",
            cursor: "pointer", fontSize: 16, fontWeight: 700,
            background: `linear-gradient(135deg,${C.gold},${C.gold}cc)`, color: C.bg,
          }}
        >
          {isLast ? "Get Started" : "Next"}
        </button>
        {!isLast && (
          <button
            onClick={onDone}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.m, padding: "4px 12px" }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
