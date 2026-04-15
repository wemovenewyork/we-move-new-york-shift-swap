"use client";

import { Depot } from "@/types";
import { OC, C } from "@/constants/colors";

interface Props { depot: Depot; size?: number; }

export default function DepotBadge({ depot, size = 44 }: Props) {
  const bg = OC[depot.operator] ?? C.blue;
  if (depot.logoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: C.bg, boxShadow: "0 2px 12px rgba(0,0,0,.5)" }}>
        <img src={depot.logoUrl} alt={depot.name} width={size} height={size} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${bg},${bg}aa)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.3, color: "#fff" }}>
      {depot.code}
    </div>
  );
}
