"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { C } from "@/constants/colors";
import MagneticButton from "@/components/ui/MagneticButton";

const IconArrows = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);

const IconSun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);

const features = [
  {
    Icon: IconArrows,
    color: C.blue,
    title: "Swap Work Days",
    desc: "Trade shifts with operators at your depot",
  },
  {
    Icon: IconCalendar,
    color: C.gold,
    title: "Swap Days Off",
    desc: "Coordinate RDOs without the runaround",
  },
  {
    Icon: IconSun,
    color: "#00C9A7",
    title: "Swap Vacation",
    desc: "Exchange vacation picks with mutual agreements",
  },
];

const stats = [
  { value: "100%", label: "Peer to peer" },
  { value: "24/7", label: "Always available" },
  { value: "Free", label: "No cost to use" },
];

export default function LandingPage() {
  const router = useRouter();
  const [v, setV] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setV(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px 80px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative ring behind logo */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -60%)",
        width: 400,
        height: 400,
        borderRadius: "50%",
        border: `1px solid ${C.gold}18`,
        animation: "spinSlow 30s linear infinite",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -60%)",
        width: 560,
        height: 560,
        borderRadius: "50%",
        border: `1px solid ${C.blue}14`,
        animation: "spinSlow 50s linear infinite reverse",
        pointerEvents: "none",
      }} />

      <style>{`
        @keyframes spinSlow { to { transform: translate(-50%, -60%) rotate(360deg); } }
        @keyframes logoGlow { 0%,100% { box-shadow: 0 0 40px ${C.gold}22, 0 0 80px ${C.gold}08; } 50% { box-shadow: 0 0 70px ${C.gold}40, 0 0 120px ${C.gold}18; } }
        @keyframes floatHero { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>

      {/* Logo */}
      <div style={{
        opacity: v ? 1 : 0,
        transform: v ? "scale(1)" : "scale(0.5)",
        transition: "all .9s cubic-bezier(.34,1.56,.64,1)",
        marginBottom: 28,
        animation: v ? "floatHero 5s ease-in-out 1s infinite" : "none",
      }}>
        <div style={{
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: `conic-gradient(from 45deg,${C.navy},${C.blue},${C.navy},${C.blue},${C.navy})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `2.5px solid ${C.gold}`,
          animation: "logoGlow 3s ease-in-out infinite",
        }}>
          <div style={{
            fontWeight: 900,
            fontSize: 13,
            color: C.gold,
            textAlign: "center",
            lineHeight: 1.2,
            letterSpacing: 1.5,
          }}>
            WE<br />MOVE<br />NY
          </div>
        </div>
      </div>

      {/* Headline */}
      <div style={{
        textAlign: "center",
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(30px)",
        transition: "all .7s cubic-bezier(.34,1.1,.64,1) .2s",
        marginBottom: 14,
      }}>
        <h1 style={{
          fontSize: "clamp(38px,9vw,76px)",
          fontWeight: 900,
          letterSpacing: -1.5,
          lineHeight: 1.0,
          background: `linear-gradient(135deg, #ffffff 0%, ${C.gold} 45%, #ffffff 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: 0,
        }}>
          Swapping Shifts<br />Made Simple
        </h1>
      </div>

      {/* Subheadline */}
      <p style={{
        fontSize: "clamp(14px,2.5vw,17px)",
        color: "rgba(255,255,255,.55)",
        maxWidth: 360,
        margin: "0 auto 40px",
        lineHeight: 1.65,
        textAlign: "center",
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(20px)",
        transition: "all .6s ease .35s",
      }}>
        Peer-to-peer shift coordination for NYC bus operators. No paperwork, no middleman — just operators helping operators.
      </p>

      {/* Bus flyer */}
      <div style={{
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(24px)",
        transition: "all .7s cubic-bezier(.34,1.1,.64,1) .4s",
        marginBottom: 36,
        width: "100%",
        maxWidth: 480,
      }}>
        <div style={{
          borderRadius: 24,
          overflow: "hidden",
          border: `1px solid ${C.gold}20`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
          background: "#fff",
        }}>
          <Image
            src="/new-flyer.png"
            alt="We Move New York bus"
            width={480}
            height={320}
            style={{ width: "100%", height: "auto", display: "block" }}
            priority
          />
        </div>
      </div>

      {/* Feature cards */}
      <div style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        flexWrap: "wrap",
        marginBottom: 40,
        maxWidth: 560,
        width: "100%",
      }}>
        {features.map((f, i) => (
          <div
            key={f.title}
            style={{
              padding: "14px 18px",
              borderRadius: 18,
              background: f.color + "0a",
              border: `1px solid ${f.color}25`,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: "1 1 160px",
              opacity: v ? 1 : 0,
              transform: v ? "translateY(0)" : "translateY(24px)",
              transition: `all .6s cubic-bezier(.34,1.1,.64,1) ${.45 + i * .1}s`,
              boxShadow: `0 4px 24px ${f.color}10`,
            }}
          >
            <span style={{ color: f.color, flexShrink: 0, display: "flex" }}>
              <f.Icon />
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex",
        gap: 24,
        justifyContent: "center",
        marginBottom: 40,
        opacity: v ? 1 : 0,
        transition: "opacity .6s ease .75s",
      }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ textAlign: "center", opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(12px)", transition: `all .5s ease ${.75 + i * .1}s` }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.gold, letterSpacing: -0.5 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: 1.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div style={{
        display: "flex",
        gap: 12,
        justifyContent: "center",
        flexWrap: "wrap",
        marginBottom: 24,
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(16px)",
        transition: "all .6s ease .85s",
      }}>
        <MagneticButton
          onClick={() => router.push("/login")}
          style={{
            padding: "16px 40px",
            borderRadius: 16,
            border: "none",
            cursor: "pointer",
            background: `linear-gradient(135deg,${C.gold},${C.gold}bb)`,
            fontSize: 16,
            fontWeight: 800,
            color: C.bg,
            boxShadow: `0 8px 32px ${C.gold}45`,
            minWidth: 160,
          }}
        >
          Sign In →
        </MagneticButton>
        <MagneticButton
          onClick={() => router.push("/login?tab=register")}
          style={{
            padding: "16px 40px",
            borderRadius: 16,
            border: "1.5px solid rgba(255,255,255,.12)",
            cursor: "pointer",
            background: "rgba(255,255,255,.04)",
            backdropFilter: "blur(16px)",
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            minWidth: 160,
          }}
        >
          Create Account
        </MagneticButton>
      </div>

      {/* Fine print */}
      <p style={{
        fontSize: 11,
        color: "rgba(255,255,255,.28)",
        textAlign: "center",
        maxWidth: 300,
        lineHeight: 1.6,
        opacity: v ? 1 : 0,
        transition: "opacity .5s ease 1s",
      }}>
        Invite code required · For authorized bus operators only
      </p>
    </main>
  );
}
