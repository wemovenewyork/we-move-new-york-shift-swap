"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Depot } from "@/types";
import { C, OC } from "@/constants/colors";
import DepotBadge from "@/components/ui/DepotBadge";
import Icon from "@/components/ui/Icon";
import Footer from "@/components/ui/Footer";
import TiltCard from "@/components/ui/TiltCard";
import Onboarding from "@/components/screens/Onboarding";

const BOROUGHS = ["All", "Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];

export default function DepotsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [depots, setDepots] = useState<Depot[]>([]);
  const [q, setQ] = useState("");
  const [bo, setBo] = useState("All");
  const [hovered, setHovered] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("onboarding-done")) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user && !localStorage.getItem("accessToken")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    api.get<Depot[]>("/depots").then(setDepots).catch(console.error);
  }, []);

  const grouped = useMemo(() => {
    const filtered = depots.filter(d =>
      (bo === "All" || d.borough === bo) &&
      (!q || d.name.toLowerCase().includes(q.toLowerCase()))
    );
    const g: Record<string, Depot[]> = {};
    filtered.forEach(d => (g[d.borough] = g[d.borough] || []).push(d));
    return g;
  }, [depots, q, bo]);

  return (
    <div className="page-enter" style={{ minHeight: "100vh", background: C.bg }}>
      {showOnboarding && (
        <Onboarding onDone={() => {
          localStorage.setItem("onboarding-done", "1");
          setShowOnboarding(false);
        }} />
      )}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.white, letterSpacing: 3, flex: 1 }}>WE MOVE NEW YORK</div>
        {user?.role === "admin" && (
          <button onClick={() => router.push("/admin")} aria-label="Admin dashboard" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #C084FC33", background: "#C084FC12", color: "#C084FC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="shield" s={15} c="#C084FC" />
          </button>
        )}
        <button onClick={() => router.push("/profile")} aria-label="Profile" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="usr" s={15} />
        </button>
      </div>
      <main id="main-content" style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ padding: "40px 0 28px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 10 }}>Welcome, {user?.firstName}</div>
          <h2 style={{ fontSize: "clamp(28px,7vw,46px)", fontWeight: 800, color: C.white, lineHeight: 1.1 }}>
            Choose Your{" "}
            <span style={{ background: `linear-gradient(135deg,${C.gold},${C.gold}bb)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Depot</span>
          </h2>
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", backdropFilter: "blur(12px)", borderRadius: 20, border: "1px solid rgba(255,255,255,.06)", padding: 18, marginBottom: 24 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search depots..." style={{ height: 48, marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BOROUGHS.map(x => (
              <button key={x} onClick={() => setBo(x)} style={{ padding: "7px 16px", borderRadius: 100, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: bo === x ? C.gold : "rgba(255,255,255,.05)", color: bo === x ? C.bg : C.m }}>
                {x}
              </button>
            ))}
          </div>
        </div>

        {depots.length === 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 66, borderRadius: 14 }} />
            ))}
          </div>
        )}

        {Object.keys(grouped).sort().map(bn => (
          <div key={bn} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>{bn}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {grouped[bn].map(d => (
                <TiltCard key={d.code} className="card-enter" intensity={6}>
                  <button
                    onClick={() => router.push(`/depot/${d.code}`)}
                    onMouseEnter={() => setHovered(d.code)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 16px", borderRadius: 14, border: "none", cursor: "pointer", textAlign: "left", transition: "background .25s, box-shadow .25s", background: hovered === d.code ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.025)", backdropFilter: "blur(8px)", borderLeft: hovered === d.code ? `3px solid ${C.gold}` : "3px solid transparent", boxShadow: hovered === d.code ? `0 8px 32px rgba(0,0,0,.2), inset 0 0 0 1px rgba(209,173,56,.15)` : `inset 0 0 0 1px rgba(255,255,255,.05)` }}
                  >
                    <DepotBadge depot={d} size={42} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{d.name}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, background: (OC[d.operator] || C.blue) + "18", fontSize: 10, fontWeight: 600, color: OC[d.operator] || C.blue }}>{d.operator}</span>
                        <span style={{ fontSize: 11, color: C.m }}>{d.borough}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ background: C.gold + "18", color: C.gold, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>{d.openSwaps ?? 0} swaps</span>
                      <Icon n="chev" s={16} c={C.gold} />
                    </div>
                  </button>
                </TiltCard>
              ))}
            </div>
          </div>
        ))}
        <Footer />
      </main>
    </div>
  );
}
