"use client";

import { RepScore } from "@/types";
import { C } from "@/constants/colors";

interface Props {
  rep?: RepScore | null;
  size?: "small" | "full";
}

export default function RepBadge({ rep, size = "small" }: Props) {
  if (!rep || rep.total === 0) {
    if (size === "small") return <span style={{ fontSize: 9, color: "#888", padding: "1px 6px", borderRadius: 4, background: "rgba(128,128,128,.12)", fontWeight: 600 }}>New</span>;
  }
  const s = rep ?? { score: 0, label: "New", color: "#888", stars: 0, reliability: 0, total: 0 };

  if (size === "small") return (
    <span style={{ fontSize: 9, color: s.color, padding: "1px 6px", borderRadius: 4, background: s.color + "15", fontWeight: 700, letterSpacing: 0.5 }}>
      {s.label} {s.score}%
    </span>
  );

  return (
    <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16, border: "1px solid " + s.color + "22" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: 2 }}>Reputation</div>
        <span style={{ padding: "3px 10px", borderRadius: 8, background: s.color + "18", border: "1px solid " + s.color + "33", fontSize: 11, fontWeight: 700, color: s.color }}>{s.label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.score}</span>
        <span style={{ fontSize: 14, color: C.m }}>/100</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[1,2,3,4,5].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: i <= s.stars ? s.color : "rgba(255,255,255,.08)" }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <div style={{ textAlign: "center", padding: 10, borderRadius: 10, background: "rgba(46,213,115,.08)" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#2ED573" }}>{s.total - (s.total - (s.total > 0 ? Math.round(s.reliability * s.total / 100) : 0))}</div>
          <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>Completed</div>
        </div>
        <div style={{ textAlign: "center", padding: 10, borderRadius: 10, background: "rgba(209,173,56,.08)" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>—</div>
          <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>Cancelled</div>
        </div>
        <div style={{ textAlign: "center", padding: 10, borderRadius: 10, background: "rgba(255,71,87,.08)" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>—</div>
          <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>No-Show</div>
        </div>
      </div>
      <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: s.reliability + "%", borderRadius: 3, background: `linear-gradient(90deg,${s.color},${s.color}88)` }} />
      </div>
      <div style={{ fontSize: 10, color: C.m, marginTop: 4 }}>{s.reliability}% reliability rate</div>
    </div>
  );
}
