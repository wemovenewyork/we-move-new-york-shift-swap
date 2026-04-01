"use client";

import { useState, useEffect, useCallback } from "react";
import { C } from "@/constants/colors";

export default function Intro({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0);
  const [pc, setPc] = useState(0);
  const stableDone = useCallback(onDone, [onDone]);

  useEffect(() => {
    const t = [
      setTimeout(() => setP(1), 300),
      setTimeout(() => setP(2), 1200),
      setTimeout(() => setP(3), 3200),
      setTimeout(stableDone, 4000),
    ];
    return () => t.forEach(clearTimeout);
  }, [stableDone]);

  useEffect(() => {
    if (p >= 2) {
      const i = setInterval(() => setPc(v => Math.min(v + 2, 100)), 30);
      return () => clearInterval(i);
    }
  }, [p]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 50% 30%,#000060,${C.bg} 70%)`, opacity: p >= 3 ? 0 : 1, transition: "opacity .8s ease" }}>
      <div style={{ opacity: p >= 1 ? 1 : 0, transform: p >= 1 ? "scale(1)" : "scale(.4)", transition: "all .9s cubic-bezier(.34,1.56,.64,1)" }}>
        <div style={{ width: 120, height: 120, borderRadius: "50%", background: `conic-gradient(from 45deg,${C.navy},${C.blue},${C.navy},${C.blue},${C.navy})`, display: "flex", alignItems: "center", justifyContent: "center", border: `2.5px solid ${C.gold}`, boxShadow: `0 0 60px ${C.gold}22` }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.gold, textAlign: "center", lineHeight: 1.15, letterSpacing: 1.5 }}>WE MOVE<br />NEW YORK</div>
        </div>
      </div>
      <div style={{ marginTop: 32, textAlign: "center", opacity: p >= 1 ? 1 : 0, transform: p >= 1 ? "translateY(0)" : "translateY(20px)", transition: "all .7s ease .3s" }}>
        <h1 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 800, letterSpacing: 8, background: `linear-gradient(135deg,${C.gold},${C.gold}cc)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SHIFT SWAP</h1>
        <div style={{ fontSize: 12, color: C.m, letterSpacing: 5, marginTop: 8, textTransform: "uppercase" }}>It&apos;s more than a uniform, it&apos;s a lifestyle</div>
      </div>
      <div style={{ position: "absolute", bottom: 50, width: 180, opacity: p >= 2 ? 1 : 0, transition: "opacity .4s" }}>
        <div style={{ height: 2, borderRadius: 1, background: C.s }}>
          <div style={{ height: "100%", width: pc + "%", background: `linear-gradient(90deg,${C.gold},${C.blue})`, transition: "width .08s linear" }} />
        </div>
      </div>
    </div>
  );
}
