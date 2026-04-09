"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { C } from "@/constants/colors";

/* ─── Step data ────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    color: C.gold,
    title: "Get Your Invite",
    desc: "We Move NY is operator-to-operator. Every new member joins with an invite code from a fellow operator. No management, no gatekeeping.",
    detail: "When you join, you automatically receive 3 invite codes to share with colleagues at your depot.",
    visual: <InviteVisual />,
  },
  {
    n: "02",
    color: C.blue,
    title: "Set Your Depot",
    desc: "Pick your home depot. Your swap board is shared only with operators at your location — keeping everything relevant and local.",
    detail: "You can update your depot once every 7 days if you transfer.",
    visual: <DepotVisual />,
  },
  {
    n: "03",
    color: "#00C9A7",
    title: "Post a Swap",
    desc: "Choose your swap type — a work day, a day off, or a vacation week. Add your shift details and hit post. It's live in seconds.",
    detail: "Work swaps include your run number, route, start time, and clear time. Days-off and vacation swaps show the dates you want to trade.",
    visual: <PostVisual />,
  },
  {
    n: "04",
    color: "#C084FC",
    title: "Get Matched",
    desc: "Browse open swaps from your depot. Our auto-matcher also scans the board and flags operators whose schedules complement yours.",
    detail: "A Mutual Match means both your schedules work for each other — the hardest part is already done.",
    visual: <MatchVisual />,
  },
  {
    n: "05",
    color: C.gold,
    title: "Message & Agree",
    desc: "Message the other operator directly to confirm details. When you're both ready, submit a formal swap agreement — one tap each.",
    detail: "Messages are private between the two of you. The agreement records both operators' names, badge numbers, and the swap details.",
    visual: <AgreementVisual />,
  },
  {
    n: "06",
    color: "#2ED573",
    title: "Print & Present",
    desc: "Once both operators confirm, a timestamped agreement is generated. Print it or show it on your phone to your dispatcher.",
    detail: "The agreement still requires supervisor approval per your depot's procedures — We Move NY coordinates the swap, it doesn't replace management sign-off.",
    visual: <PrintVisual />,
  },
];

/* ─── Mini visuals ─────────────────────────────────────────────────────────── */

function InviteVisual() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <div style={{ padding: "10px 20px", borderRadius: 12, background: `${C.gold}18`, border: `1px solid ${C.gold}44`, fontFamily: "monospace", fontSize: 15, fontWeight: 800, color: C.gold, letterSpacing: 3 }}>WMNY-K7X4</div>
      <div style={{ fontSize: 11, color: C.m }}>Your invite code</div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        {["K4J2","M9P1","R3N8"].map(c => (
          <div key={c} style={{ padding: "5px 10px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: `1px solid rgba(255,255,255,.08)`, fontSize: 11, color: "rgba(255,255,255,.4)", letterSpacing: 1 }}>WMNY-{c}</div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.m, marginTop: 2 }}>3 codes to share with colleagues</div>
    </div>
  );
}

function DepotVisual() {
  const depots = ["Queens Village", "East New York", "Flatbush", "Gun Hill", "Spring Creek"];
  return (
    <div style={{ width: "100%", maxWidth: 260 }}>
      {depots.slice(0,3).map((d, i) => (
        <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: i === 1 ? `${C.blue}18` : "rgba(255,255,255,.03)", border: `1px solid ${i === 1 ? C.blue + "44" : "rgba(255,255,255,.06)"}`, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 1 ? C.blue : "rgba(255,255,255,.15)", boxShadow: i === 1 ? `0 0 8px ${C.blue}` : "none" }} />
          <div style={{ fontSize: 13, fontWeight: i === 1 ? 700 : 400, color: i === 1 ? C.white : C.m, flex: 1 }}>{d}</div>
          {i === 1 && <div style={{ fontSize: 10, color: C.blue, fontWeight: 700, border: `1px solid ${C.blue}44`, padding: "2px 8px", borderRadius: 6 }}>Selected</div>}
        </div>
      ))}
    </div>
  );
}

function PostVisual() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => (v + 1) % 4), 800);
    return () => clearInterval(t);
  }, []);
  const fields = [
    { label: "Type", value: "Work Swap", color: C.blue },
    { label: "Date", value: "Tomorrow" },
    { label: "Run", value: "142 · Route B46" },
  ];
  return (
    <div style={{ width: "100%", maxWidth: 240 }}>
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: 14 }}>
        {fields.map((f, i) => (
          <div key={f.label} style={{ marginBottom: i < 2 ? 8 : 0 }}>
            <div style={{ fontSize: 9, color: C.m, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>{f.label}</div>
            <div style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,.05)", fontSize: 12, color: f.color ?? C.white, display: "flex", alignItems: "center" }}>
              {f.value}
              {tick % 2 === 0 && i === 2 && <span style={{ display: "inline-block", width: 1, height: 11, background: C.gold, marginLeft: 4 }} />}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, padding: "9px", borderRadius: 10, background: "#00C9A7", fontSize: 12, fontWeight: 700, color: "#001a15", textAlign: "center" }}>
          Post Swap
        </div>
      </div>
    </div>
  );
}

function MatchVisual() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 260 }}>
      {[
        { op: "Operator A", day: "Mon Off → wants to work", color: C.blue, match: true },
        { op: "Operator B", day: "Mon Work → wants off", color: "#00C9A7", match: true },
      ].map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: `${r.color}10`, border: `1px solid ${r.color}33` }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${r.color}20`, border: `1px solid ${r.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: r.color, flexShrink: 0 }}>{i === 0 ? "A" : "B"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.white }}>{r.op}</div>
            <div style={{ fontSize: 10, color: C.m, marginTop: 1 }}>{r.day}</div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: `${C.gold}12`, border: `1px solid ${C.gold}33` }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, boxShadow: `0 0 8px ${C.gold}` }} />
        <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>Mutual Match detected</div>
      </div>
    </div>
  );
}

function AgreementVisual() {
  return (
    <div style={{ width: "100%", maxWidth: 260 }}>
      <div style={{ borderRadius: 14, border: `1px solid rgba(192,132,252,.2)`, background: "rgba(192,132,252,.05)", padding: 14 }}>
        <div style={{ fontSize: 10, color: "#C084FC", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Swap Agreement</div>
        {[
          { label: "Operator A", value: "John D. · Badge 4821" },
          { label: "Operator B", value: "Maria S. · Badge 3376" },
          { label: "Swap Date", value: "Monday, April 14" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ color: C.m }}>{f.label}</span>
            <span style={{ color: C.white, fontWeight: 600 }}>{f.value}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <div style={{ flex: 1, padding: "7px", borderRadius: 8, background: "rgba(0,201,167,.12)", border: "1px solid rgba(0,201,167,.3)", fontSize: 11, fontWeight: 700, color: "#00C9A7", textAlign: "center" }}>✓ Confirmed</div>
          <div style={{ flex: 1, padding: "7px", borderRadius: 8, background: "rgba(0,201,167,.12)", border: "1px solid rgba(0,201,167,.3)", fontSize: 11, fontWeight: 700, color: "#00C9A7", textAlign: "center" }}>✓ Confirmed</div>
        </div>
      </div>
    </div>
  );
}

function PrintVisual() {
  return (
    <div style={{ width: "100%", maxWidth: 240 }}>
      <div style={{ borderRadius: 14, border: "1px solid rgba(46,213,115,.25)", background: "rgba(46,213,115,.05)", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(46,213,115,.15)", border: "1px solid rgba(46,213,115,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#2ED573" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2ED573" }}>Agreement Locked</div>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.06)", marginBottom: 6 }} />
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.06)", width: "75%", marginBottom: 6 }} />
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.06)", width: "60%", marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1, padding: "8px", borderRadius: 8, background: C.gold, fontSize: 11, fontWeight: 700, color: C.bg, textAlign: "center" }}>Print PDF</div>
          <div style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.03)", fontSize: 11, fontWeight: 600, color: C.m, textAlign: "center" }}>Share</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step card with scroll-triggered reveal ───────────────────────────────── */

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity .5s ease ${index * .08}s, transform .5s ease ${index * .08}s`,
        borderRadius: 20,
        border: `1px solid rgba(255,255,255,.06)`,
        background: "rgba(255,255,255,.025)",
        padding: 24,
        marginBottom: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Glow corner */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle,${step.color}18 0%,transparent 70%)`, pointerEvents: "none" }} />

      {/* Step number */}
      <div style={{ fontSize: 11, fontWeight: 800, color: step.color, letterSpacing: 2, marginBottom: 14, opacity: .7 }}>STEP {step.n}</div>

      {/* Visual */}
      <div style={{ marginBottom: 20 }}>
        {step.visual}
      </div>

      {/* Text */}
      <h3 style={{ fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 8, lineHeight: 1.25 }}>{step.title}</h3>
      <p style={{ fontSize: 14, color: C.m, lineHeight: 1.7, marginBottom: 10 }}>{step.desc}</p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 10 }}>{step.detail}</p>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}
          aria-label="Go back"
        >
          ←
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>How It Works</div>
      </div>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "0 16px 120px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "48px 16px 40px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <Image src="/bus-logo.png" alt="We Move NY" width={200} height={95} style={{ width: 200, height: "auto" }} />
          </div>
          <h1 style={{
            fontSize: "clamp(26px,5vw,36px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 14,
            background: `linear-gradient(135deg,${C.white} 30%,${C.gold})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Swapping Shifts<br />Made Simple
          </h1>
          <p style={{ fontSize: 15, color: C.m, lineHeight: 1.7, maxWidth: 340, margin: "0 auto" }}>
            Six steps from sign-up to confirmed swap — all on your phone, all peer to peer.
          </p>
        </div>

        {/* Steps */}
        {STEPS.map((step, i) => (
          <StepCard key={step.n} step={step} index={i} />
        ))}

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "32px 0 0" }}>
          <div style={{ fontSize: 14, color: C.m, marginBottom: 16 }}>Ready to swap smarter?</div>
          <button
            onClick={() => router.push("/login")}
            style={{ padding: "14px 40px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, background: `linear-gradient(135deg,${C.gold},${C.gold}cc)`, color: C.bg, boxShadow: `0 4px 20px ${C.gold}40` }}
          >
            Get Started
          </button>
        </div>
      </main>
    </div>
  );
}
