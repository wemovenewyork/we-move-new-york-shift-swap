"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C, CM, SWAP_TYPES } from "@/constants/colors";
import Icon from "@/components/ui/Icon";
import BottomNav from "@/components/ui/BottomNav";
import RepBadge from "@/components/ui/RepBadge";
import NotifIcon from "@/components/ui/NotifIcon";
import InboxIcon from "@/components/ui/InboxIcon";
import { Swap } from "@/types";
import { fmtTime } from "@/lib/format";

interface MatchedSwap extends Swap {
  _matchScore: number;
  _mySwapId: string;
  _matchReason: string;
}

export default function MatchesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;
  const [matches, setMatches] = useState<MatchedSwap[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !user.depotId) router.replace("/setup-profile");
    if (!loading && user?.depot && user.depot.code !== code && user.role !== "admin" && user.role !== "subAdmin") router.replace(`/depot/${user.depot.code}/swaps`);
  }, [user, loading, router, code]);

  useEffect(() => {
    if (!user) return;
    api.get<MatchedSwap[]>("/swaps/matches")
      .then(setMatches)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.85)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(`/depot/${code}`)} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.white }}>Mutual Matches</div>
          <div style={{ fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>Swaps that fit yours perfectly</div>
        </div>
        <NotifIcon />
        <InboxIcon />
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F59E0B18", border: "1px solid #F59E0B33", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="match" s={18} c="#F59E0B" />
        </div>
      </div>

      <main id="main-content" tabIndex={-1} style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px 0" }}>
        {fetching ? (
          <div style={{ textAlign: "center", paddingTop: 60, color: C.m, fontSize: 13 }}>Finding matches...</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F59E0B12", border: "1px solid #F59E0B33", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="match" s={28} c="#F59E0B" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 8 }}>No matches yet</div>
            <div style={{ fontSize: 13, color: C.m, lineHeight: 1.6 }}>Post a swap and we&apos;ll find other operators whose schedules complement yours.</div>
            <button onClick={() => router.push(`/depot/${code}/post`)} style={{ marginTop: 20, padding: "12px 24px", borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,#F59E0B,#F59E0Bcc)`, fontSize: 14, fontWeight: 700, color: "#fff" }}>
              Post a Swap
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {matches.map(m => {
              const cat = CM[m.category] ?? CM.work;
              const co = SWAP_TYPES.find(x => x.id === m.category);
              const isPerfect = m._matchScore === 100;
              return (
                <div
                  key={m.id}
                  onClick={() => router.push(`/depot/${code}/swaps/${m.id}`)}
                  style={{ background: "rgba(255,255,255,.04)", borderRadius: 18, padding: 18, border: `1px solid ${isPerfect ? "#F59E0B44" : "rgba(255,255,255,.06)"}`, cursor: "pointer", transition: "all .2s", boxShadow: isPerfect ? "0 0 20px #F59E0B18" : "none" }}
                >
                  {/* Match badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon n={co?.ic || "swap"} s={14} c={cat.c} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: cat.c, textTransform: "uppercase", letterSpacing: 1 }}>{co?.f}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: isPerfect ? "#F59E0B18" : "rgba(255,255,255,.06)", border: `1px solid ${isPerfect ? "#F59E0B44" : "rgba(255,255,255,.1)"}` }}>
                      <Icon n="match" s={10} c={isPerfect ? "#F59E0B" : C.m} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: isPerfect ? "#F59E0B" : C.m }}>{isPerfect ? "Perfect Match" : `${m._matchScore}% Match`}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{m.posterName}</span>
                    <RepBadge rep={m.reputation} size="small" />
                  </div>

                  {/* Match reason */}
                  <div style={{ padding: "8px 12px", borderRadius: 10, background: "#F59E0B0a", border: "1px solid #F59E0B22", marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: "#F59E0B", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Why this matches</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>{m._matchReason}</div>
                  </div>

                  {/* Category-specific preview */}
                  {m.category === "daysoff" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, alignItems: "center" }}>
                      <div style={{ padding: "6px 10px", borderRadius: 8, background: C.gs }}>
                        <div style={{ fontSize: 8, color: C.gold, textTransform: "uppercase" }}>From</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{m.fromDay}</div>
                      </div>
                      <Icon n="swap" s={14} c={C.m} />
                      <div style={{ padding: "6px 10px", borderRadius: 8, background: C.blue + "12" }}>
                        <div style={{ fontSize: 8, color: C.blue, textTransform: "uppercase" }}>To</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{m.toDay}</div>
                      </div>
                    </div>
                  )}
                  {m.category === "vacation" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, alignItems: "center" }}>
                      <div style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(0,201,167,.08)" }}>
                        <div style={{ fontSize: 8, color: "#00C9A7", textTransform: "uppercase" }}>Have</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{m.vacationHave}</div>
                      </div>
                      <Icon n="swap" s={14} c={C.m} />
                      <div style={{ padding: "6px 10px", borderRadius: 8, background: C.blue + "12" }}>
                        <div style={{ fontSize: 8, color: C.blue, textTransform: "uppercase" }}>Want</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{m.vacationWant}</div>
                      </div>
                    </div>
                  )}
                  {m.category === "work" && (m.run || m.route) && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {m.run && <div style={{ flex: 1, padding: "6px 10px", borderRadius: 8, background: C.blue + "0d" }}>
                        <div style={{ fontSize: 8, color: C.blue, textTransform: "uppercase", letterSpacing: 1 }}>Run</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{m.run}</div>
                      </div>}
                      {m.route && <div style={{ flex: 1, padding: "6px 10px", borderRadius: 8, background: C.blue + "0d" }}>
                        <div style={{ fontSize: 8, color: C.blue, textTransform: "uppercase", letterSpacing: 1 }}>Route</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{m.route}</div>
                      </div>}
                      {m.startTime && <div style={{ flex: 1, padding: "6px 10px", borderRadius: 8, background: C.blue + "0d" }}>
                        <div style={{ fontSize: 8, color: C.blue, textTransform: "uppercase", letterSpacing: 1 }}>Start</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{fmtTime(m.startTime)}</div>
                      </div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav depotCode={code} active="matches" />
    </div>
  );
}
