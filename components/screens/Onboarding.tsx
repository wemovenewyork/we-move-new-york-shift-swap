"use client";

import { useState, useEffect } from "react";
import { C } from "@/constants/colors";

/* ─── Per-step animated illustrations ─────────────────────────────────────── */

function IllustrationSwap() {
  return (
    <div style={{ position: "relative", width: 260, height: 160, margin: "0 auto" }}>
      <style>{`
        @keyframes rowIn { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes arrowPulse { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
      `}</style>
      {[
        { from: "Mon", to: "Tue",  delay: "0s",   color: C.blue },
        { from: "Wed", to: "Fri",  delay: ".15s",  color: C.gold },
        { from: "Sat", to: "Sun",  delay: ".3s",   color: "#00C9A7" },
      ].map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 18, animation: `rowIn .5s ease ${r.delay} both` }}>
          <div style={{ padding: "6px 16px", borderRadius: 10, background: r.color + "18", border: `1px solid ${r.color}44`, fontSize: 13, fontWeight: 700, color: r.color, minWidth: 56, textAlign: "center" }}>{r.from}</div>
          <svg width="28" height="16" viewBox="0 0 28 16" fill="none" style={{ animation: "arrowPulse 1.8s ease-in-out infinite", animationDelay: r.delay }}>
            <path d="M0 5h20M16 1l4 4-4 4" stroke={r.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M28 11H8M12 7l-4 4 4 4" stroke={r.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ padding: "6px 16px", borderRadius: 10, background: r.color + "18", border: `1px solid ${r.color}44`, fontSize: 13, fontWeight: 700, color: r.color, minWidth: 56, textAlign: "center" }}>{r.to}</div>
        </div>
      ))}
    </div>
  );
}

function IllustrationPost() {
  const [field, setField] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setField(v => (v < 3 ? v + 1 : v)), 600);
    return () => clearInterval(t);
  }, []);
  const fields = ["Work Swap", "Tomorrow · 6:15 AM", "Run 142 · Route B46"];
  return (
    <div style={{ width: 240, margin: "0 auto" }}>
      <style>{`
        @keyframes cardIn { from{opacity:0;transform:translateY(20px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fieldAppear { from{opacity:0;maxHeight:0} to{opacity:1;maxHeight:40px} }
        @keyframes btnGlow { 0%,100%{box-shadow:0 0 0 0 rgba(209,173,56,0)} 50%{box-shadow:0 0 20px 4px rgba(209,173,56,.35)} }
        @keyframes cursor { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
      <div style={{ borderRadius: 16, border: `1px solid rgba(255,255,255,.1)`, background: "rgba(255,255,255,.04)", padding: 16, animation: "cardIn .5s ease both" }}>
        <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>New Swap</div>
        {fields.map((f, i) => (
          <div key={i} style={{ overflow: "hidden", maxHeight: field > i ? 40 : 0, opacity: field > i ? 1 : 0, transition: "all .4s ease", marginBottom: 8 }}>
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: `1px solid rgba(255,255,255,.08)`, fontSize: 12, color: C.white, display: "flex", alignItems: "center", gap: 6 }}>
              {f}
              {field === i + 1 && <span style={{ display: "inline-block", width: 1, height: 12, background: C.gold, animation: "cursor .8s step-end infinite" }} />}
            </div>
          </div>
        ))}
        {field >= 3 && (
          <div style={{ marginTop: 12, padding: "10px", borderRadius: 12, background: C.gold, fontSize: 13, fontWeight: 700, color: C.bg, textAlign: "center", animation: "cardIn .4s ease both, btnGlow 2s ease-in-out .5s infinite" }}>
            Post Swap
          </div>
        )}
      </div>
    </div>
  );
}

function IllustrationMatch() {
  return (
    <div style={{ position: "relative", width: 260, height: 140, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes opLeft { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes opRight { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes beamGrow { from{width:0;opacity:0} to{width:80px;opacity:1} }
        @keyframes matchBadge { 0%{opacity:0;transform:scale(.3) translateY(-50%)} 60%{transform:scale(1.15) translateY(-50%)} 100%{opacity:1;transform:scale(1) translateY(-50%)} }
        @keyframes sparkle { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
      `}</style>
      {/* Operator A */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, animation: "opLeft .5s ease both" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.navy})`, border: `2px solid ${C.blue}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>A</div>
        <div style={{ fontSize: 11, color: C.m, fontWeight: 600 }}>Mon Off</div>
      </div>
      {/* Beam */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px" }}>
        <div style={{ height: 2, background: `linear-gradient(90deg,${C.blue},${C.gold},#00C9A7)`, borderRadius: 2, animation: "beamGrow .6s ease .4s both" }} />
        <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", background: C.gold, color: C.bg, fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 8, letterSpacing: 1, whiteSpace: "nowrap", animation: "matchBadge .5s cubic-bezier(.34,1.56,.64,1) .8s both" }}>MATCH</div>
        {/* sparkles */}
        {[[-20,-16],[20,-16],[-24,8],[24,8]].map(([x,y],i) => (
          <div key={i} style={{ position: "absolute", top: y, left: x, width: 4, height: 4, borderRadius: "50%", background: C.gold, animation: `sparkle 1.2s ease-in-out ${.9 + i*.15}s infinite` }} />
        ))}
      </div>
      {/* Operator B */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, animation: "opRight .5s ease both" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,#00C9A7,#007a66)`, border: `2px solid #00C9A7`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>B</div>
        <div style={{ fontSize: 11, color: C.m, fontWeight: 600 }}>Mon Work</div>
      </div>
    </div>
  );
}

function IllustrationConfirm() {
  return (
    <div style={{ position: "relative", width: 200, height: 160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes docIn { from{opacity:0;transform:scale(.8) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes checkDraw { from{stroke-dashoffset:60} to{stroke-dashoffset:0} }
        @keyframes sealPop { 0%{opacity:0;transform:scale(.4) rotate(-20deg)} 60%{transform:scale(1.1) rotate(3deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }
        @keyframes confettiA { 0%{opacity:1;transform:translateY(0) rotate(0)} 100%{opacity:0;transform:translateY(-60px) rotate(360deg)} }
        @keyframes confettiB { 0%{opacity:1;transform:translateY(0) rotate(0)} 100%{opacity:0;transform:translateY(-50px) translateX(20px) rotate(-180deg)} }
        @keyframes confettiC { 0%{opacity:1;transform:translateY(0) rotate(0)} 100%{opacity:0;transform:translateY(-55px) translateX(-18px) rotate(270deg)} }
      `}</style>
      {/* Document */}
      <div style={{ width: 140, borderRadius: 16, border: `1px solid rgba(192,132,252,.3)`, background: "rgba(192,132,252,.06)", padding: "18px 16px", animation: "docIn .5s ease both", position: "relative" }}>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.1)", marginBottom: 8 }} />
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.07)", width: "70%", marginBottom: 8 }} />
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.07)", width: "85%", marginBottom: 16 }} />
        {/* Checkmark circle */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,201,167,.12)", border: "2px solid #00C9A7", display: "flex", alignItems: "center", justifyContent: "center", animation: "sealPop .6s cubic-bezier(.34,1.56,.64,1) .4s both" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#00C9A7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="0" style={{ animation: "checkDraw .5s ease .8s both", strokeDashoffset: 60 }} />
            </svg>
          </div>
        </div>
        {/* Confetti */}
        {[
          { x: 30, color: C.gold, anim: "confettiA" },
          { x: 80, color: "#C084FC", anim: "confettiB" },
          { x: 110, color: "#00C9A7", anim: "confettiC" },
          { x: 50, color: C.blue, anim: "confettiB" },
          { x: 100, color: C.gold, anim: "confettiA" },
        ].map((c, i) => (
          <div key={i} style={{ position: "absolute", bottom: 24, left: c.x, width: 6, height: 6, borderRadius: 2, background: c.color, animation: `${c.anim} 1s ease-out ${1 + i * .1}s both` }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Step config ──────────────────────────────────────────────────────────── */

const STEPS = [
  {
    color: C.gold,
    title: "Swapping Shifts\nMade Simple",
    body: "We Move NY is the fastest way for bus operators to swap work days, days off, and vacation weeks — peer to peer, no paperwork.",
    Illustration: IllustrationSwap,
  },
  {
    color: C.blue,
    title: "Post Your Swap",
    body: "Choose your swap type, add your shift details, and post it to your depot board. Takes under a minute.",
    Illustration: IllustrationPost,
  },
  {
    color: "#00C9A7",
    title: "Find Your Match",
    body: "Browse open swaps or let the auto-matcher pair you with an operator whose schedule complements yours.",
    Illustration: IllustrationMatch,
  },
  {
    color: "#C084FC",
    title: "Lock It In",
    body: "Both operators confirm. A timestamped agreement is created — print it and bring it to your dispatcher.",
    Illustration: IllustrationConfirm,
  },
];

/* ─── Main component ───────────────────────────────────────────────────────── */

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [animKey, setAnimKey] = useState(0);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  const go = (next: number, direction: 1 | -1 = 1) => {
    setDir(direction);
    setAnimKey(k => k + 1);
    setStep(next);
  };

  const advance = () => {
    if (isLast) { onDone(); return; }
    go(step + 1, 1);
  };

  const back = () => {
    if (step === 0) return;
    go(step - 1, -1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App onboarding"
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(1,0,40,.98)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes slideInRight { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideInLeft  { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp       { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes progressFill { from{width:0} to{width:var(--pw)} }
      `}</style>

      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,.06)" }}>
        <div style={{
          height: "100%",
          background: `linear-gradient(90deg,${s.color},${s.color}99)`,
          width: `${((step + 1) / STEPS.length) * 100}%`,
          transition: "width .4s cubic-bezier(.34,1.2,.64,1), background .4s ease",
          boxShadow: `0 0 12px ${s.color}80`,
        }} />
      </div>

      {/* Skip */}
      {!isLast && (
        <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
          <button onClick={onDone} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,.35)", padding: "4px 8px", fontWeight: 600 }}>
            Skip
          </button>
        </div>
      )}

      {/* Step counter */}
      <div style={{ position: "absolute", top: 20, left: 20, fontSize: 11, color: "rgba(255,255,255,.25)", fontWeight: 700, letterSpacing: 1 }}>
        {step + 1} / {STEPS.length}
      </div>

      {/* Content */}
      <div
        key={animKey}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 32px 0",
          animation: `${dir === 1 ? "slideInRight" : "slideInLeft"} .4s cubic-bezier(.34,1.1,.64,1) both`,
        }}
      >
        {/* Color glow backdrop */}
        <div style={{
          position: "absolute",
          width: 300, height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle,${s.color}12 0%,transparent 70%)`,
          pointerEvents: "none",
          transition: "background .5s ease",
        }} />

        {/* Illustration */}
        <div style={{ marginBottom: 40, position: "relative", zIndex: 1 }}>
          <s.Illustration />
        </div>

        {/* Text */}
        <div style={{ textAlign: "center", maxWidth: 320, position: "relative", zIndex: 1 }}>
          <h2 style={{
            fontSize: 28, fontWeight: 900, lineHeight: 1.15, marginBottom: 14,
            background: `linear-gradient(135deg,${C.white} 30%,${s.color})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            whiteSpace: "pre-line",
            animation: "fadeUp .4s ease .1s both",
          }}>
            {s.title}
          </h2>
          <p style={{
            fontSize: 15, color: C.m, lineHeight: 1.7,
            animation: "fadeUp .4s ease .2s both",
          }}>
            {s.body}
          </p>
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, paddingTop: 32 }}>
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i, i > step ? 1 : -1)}
            aria-label={`Go to step ${i + 1}`}
            style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? s.color : "rgba(255,255,255,.15)",
              border: "none", cursor: "pointer", padding: 0,
              transition: "all .3s cubic-bezier(.34,1.2,.64,1)",
              boxShadow: i === step ? `0 0 8px ${s.color}80` : "none",
            }}
          />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ padding: "24px 32px max(32px,env(safe-area-inset-bottom))", display: "flex", gap: 12 }}>
        {step > 0 && (
          <button
            onClick={back}
            style={{
              flex: "0 0 52px", height: 52, borderRadius: 16,
              border: `1px solid rgba(255,255,255,.1)`, background: "rgba(255,255,255,.04)",
              cursor: "pointer", color: C.m, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ←
          </button>
        )}
        <button
          onClick={advance}
          style={{
            flex: 1, height: 52, borderRadius: 16, border: "none",
            cursor: "pointer", fontSize: 16, fontWeight: 700,
            background: `linear-gradient(135deg,${s.color},${s.color}cc)`,
            color: C.bg,
            boxShadow: `0 4px 20px ${s.color}40`,
            transition: "background .4s ease, box-shadow .4s ease",
          }}
        >
          {isLast ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}
