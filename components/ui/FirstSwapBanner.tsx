"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

export default function FirstSwapBanner({ depotCode }: { depotCode: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("first-swap-done")) return;
    // Check if user has any swaps
    api.get<{ swaps: unknown[] }>("/swaps?limit=1").then(d => {
      if (d.swaps.length === 0) setShow(true);
    }).catch(() => {});
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem("first-swap-done", "1");
    setShow(false);
  };

  return (
    <div style={{
      margin: "0 0 12px",
      borderRadius: 16,
      background: `linear-gradient(135deg,${C.gold}12,${C.gold}06)`,
      border: `1px solid ${C.gold}33`,
      padding: "16px 16px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: C.gold + "18", border: `1px solid ${C.gold}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon n="edit" s={18} c={C.gold} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 3 }}>Post your first swap</div>
          <div style={{ fontSize: 12, color: C.m, lineHeight: 1.5 }}>
            You haven&apos;t posted a swap yet. Let other operators know what you&apos;re looking for — it only takes 30 seconds.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => { dismiss(); router.push(`/depot/${depotCode}/post`); }}
              style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}cc)`, color: C.bg, fontSize: 13, fontWeight: 700 }}
            >
              Post a Swap
            </button>
            <button
              onClick={dismiss}
              style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.gold}18` }}>
        {[
          { n: "1", t: "Pick a type", s: "Work, days off, or vacation" },
          { n: "2", t: "Add details", s: "Date, run, shift info" },
          { n: "3", t: "Post it", s: "Operators at your depot will see it" },
        ].map(step => (
          <div key={step.n} style={{ textAlign: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.gold, color: C.bg, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>{step.n}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.white }}>{step.t}</div>
            <div style={{ fontSize: 10, color: C.m, marginTop: 1 }}>{step.s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
