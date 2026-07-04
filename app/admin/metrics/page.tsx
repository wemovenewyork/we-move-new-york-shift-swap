"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";
import type {
  MetricsResponse, Series, GrowthSection, MarketplaceSection, TrustSection, NotificationsSection,
} from "@/lib/metrics";

type Range = "7d" | "30d" | "90d";
const RANGES: Range[] = ["7d", "30d", "90d"];

// ── tiny hand-rolled viz (no chart lib) ─────────────────────────────────────

function Sparkline({ series, color = C.gold }: { series: Series; color?: string }) {
  const vals = series.values;
  if (vals.length < 2) return <div style={{ height: 40 }} />;
  const max = Math.max(1, ...vals);
  const w = 240, h = 40;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function BarList({ rows, color = C.blue }: { rows: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <div style={{ fontSize: 12, color: C.m }}>No data</div>;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: "90px 1fr 40px", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.m, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: "100%", background: color, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.white, textAlign: "right" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function sum(s?: Series): number { return s ? s.values.reduce((a, b) => a + b, 0) : 0; }
/** Delta of the current period vs the immediately-prior equal-length window. */
function splitDelta(s?: Series): { total: number; delta: number | null } {
  if (!s || s.values.length < 2) return { total: sum(s), delta: null };
  const half = Math.floor(s.values.length / 2);
  const prev = s.values.slice(0, half).reduce((a, b) => a + b, 0);
  const cur = s.values.slice(half).reduce((a, b) => a + b, 0);
  return { total: sum(s), delta: prev === 0 ? null : Math.round(((cur - prev) / prev) * 100) };
}
function pct(v: number | null | undefined): string { return v == null ? "—" : `${Math.round(v * 100)}%`; }
function n1(v: number | null | undefined): string { return v == null ? "—" : v.toFixed(1); }

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, borderRadius: 16, padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function Headline({ value, delta, sub }: { value: string | number; delta?: number | null; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: C.white }}>{value}</span>
        {delta != null && (
          <span style={{ fontSize: 12, fontWeight: 700, color: delta >= 0 ? "#2ED573" : "#FF4757" }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.m, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionFailed({ name }: { name: string }) {
  return <Card title={name}><div style={{ fontSize: 12, color: "#FF4757" }}>This section failed to load. Others are unaffected.</div></Card>;
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function AdminMetricsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0); // refetch trigger for the refresh/retry buttons

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !["admin", "subAdmin"].includes(user.role)) router.replace("/depots");
  }, [user, loading, router]);

  const isAdmin = !!user && ["admin", "subAdmin"].includes(user.role);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    // Fetch inside an async IIFE so every setState lands after the await
    // (never synchronously in the effect body). "loading" is set by the
    // handlers below and the initial state.
    (async () => {
      try {
        const res = await api.get<MetricsResponse>(`/admin/metrics?range=${range}`);
        if (!cancelled) { setData(res); setState("ready"); }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, range, nonce]);

  const refetch = () => { setState("loading"); setNonce((n) => n + 1); };

  if (!isAdmin) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.85)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/admin")} aria-label="Back to admin" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>Metrics</div>
        <div style={{ display: "flex", gap: 4, background: C.s, borderRadius: 10, padding: 3 }}>
          {RANGES.map((r) => (
            <button key={r} onClick={() => { setState("loading"); setRange(r); }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: range === r ? C.gold : "transparent", color: range === r ? C.bg : C.m }}>{r}</button>
          ))}
        </div>
        <button onClick={refetch} aria-label="Refresh" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="swap" s={15} />
        </button>
      </div>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "20px 20px 80px" }}>
        {state === "loading" && <div style={{ fontSize: 13, color: C.m, padding: 40, textAlign: "center" }}>Loading metrics…</div>}
        {state === "error" && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#FF4757", marginBottom: 12 }}>Couldn&apos;t load metrics.</div>
            <button onClick={refetch} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.white, cursor: "pointer", fontSize: 13 }}>Retry</button>
          </div>
        )}
        {state === "ready" && data && (
          <>
            <div style={{ fontSize: 11, color: C.m, marginBottom: 14 }}>
              Refreshed {new Date(data.meta.generatedAt).toLocaleString()} · {data.meta.bucketUnit}ly buckets
              {data.meta.errors.length > 0 && <span style={{ color: "#FF4757" }}> · {data.meta.errors.length} section(s) degraded</span>}
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {data.growth ? <GrowthCard g={data.growth} ms={data.meta.timings.growth} /> : <SectionFailed name="Growth" />}
              {data.marketplace ? <MarketplaceCard m={data.marketplace} ms={data.meta.timings.marketplace} /> : <SectionFailed name="Marketplace" />}
              {data.trust ? <TrustCard t={data.trust} ms={data.meta.timings.trust} /> : <SectionFailed name="Trust" />}
              {data.notifications ? <NotificationsCard n={data.notifications} ms={data.meta.timings.notifications} /> : <SectionFailed name="Notifications" />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Timing({ ms }: { ms?: number }) {
  return ms != null ? <span style={{ fontSize: 10, color: C.m, fontWeight: 400 }}> · {ms}ms</span> : null;
}

function GrowthCard({ g, ms }: { g: GrowthSection; ms?: number }) {
  const s = splitDelta(g.signups);
  return (
    <Card title={<>Growth<Timing ms={ms} /></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <Headline value={g.totalUsers} sub="total users" />
          <Headline value={s.total} delta={s.delta} sub="signups this period" />
          <Sparkline series={g.signups} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.m, marginBottom: 8 }}>Active users / bucket</div>
          <Sparkline series={g.activeUsers} color="#2ED573" />
          <div style={{ fontSize: 11, color: C.m, margin: "12px 0 8px" }}>Signups by source</div>
          <BarList rows={g.signupsBySource.map((r) => ({ label: r.source, value: r.count }))} />
        </div>
      </div>
    </Card>
  );
}

function MarketplaceCard({ m, ms }: { m: MarketplaceSection; ms?: number }) {
  const posted = splitDelta(m.posted);
  return (
    <Card title={<>Marketplace<Timing ms={ms} /></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <Headline value={posted.total} delta={posted.delta} sub="swaps posted" />
          <Sparkline series={m.posted} />
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: C.m }}>
            <span>Filled <strong style={{ color: C.white }}>{sum(m.filled)}</strong></span>
            <span>Expired <strong style={{ color: C.white }}>{sum(m.expired)}</strong></span>
            <span>Fill rate <strong style={{ color: C.white }}>{pct(m.fillRate)}</strong>*</span>
          </div>
          <div style={{ fontSize: 10, color: C.m, marginTop: 4 }}>*same-bucket approximation</div>
          <div style={{ fontSize: 12, color: C.m, marginTop: 10 }}>
            Hours to fill — median <strong style={{ color: C.white }}>{n1(m.hoursToFill.median)}</strong> · p90 <strong style={{ color: C.white }}>{n1(m.hoursToFill.p90)}</strong>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.m, marginBottom: 8 }}>Open by category</div>
          <BarList rows={m.openByCategory.map((r) => ({ label: r.category, value: r.count }))} color="#00C9A7" />
          <div style={{ fontSize: 11, color: C.m, margin: "12px 0 8px" }}>Open by depot (top 10)</div>
          <BarList rows={m.openByDepot.map((r) => ({ label: r.depot, value: r.count }))} />
        </div>
      </div>
    </Card>
  );
}

function TrustCard({ t, ms }: { t: TrustSection; ms?: number }) {
  const p = splitDelta(t.proposals);
  return (
    <Card title={<>Trust<Timing ms={ms} /></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <Headline value={p.total} delta={p.delta} sub="proposals this period" />
          <Sparkline series={t.proposals} color="#C084FC" />
          <div style={{ fontSize: 12, color: C.m, marginTop: 10 }}>
            Response rate <strong style={{ color: C.white }}>{pct(t.postShiftResponseRate)}</strong> ·
            Reviews <strong style={{ color: C.white }}>{pct(t.reviewSubmissionRate)}</strong> ·
            Avg ★ <strong style={{ color: C.white }}>{n1(t.avgRating)}</strong>
          </div>
          <div style={{ fontSize: 12, color: C.m, marginTop: 6 }}>Proposals / filled swap <strong style={{ color: C.white }}>{n1(t.proposalsPerFilledSwap)}</strong></div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.m, marginBottom: 8 }}>Proposal outcomes</div>
          <BarList color="#C084FC" rows={[
            { label: "accepted", value: t.proposalSplit.accepted },
            { label: "declined†", value: t.proposalSplit.declined },
            { label: "withdrawn", value: t.proposalSplit.withdrawn },
            { label: "pending", value: t.proposalSplit.pending },
          ]} />
          <div style={{ fontSize: 11, color: C.m, margin: "12px 0 8px" }}>Post-shift outcomes</div>
          <BarList rows={[
            { label: "confirmed", value: t.outcomeSplit.completedConfirmed },
            { label: "unverified", value: t.outcomeSplit.completedUnverified },
            { label: "disputed", value: t.outcomeSplit.disputed },
            { label: "cancelled", value: t.outcomeSplit.cancelled },
          ]} />
          <div style={{ fontSize: 10, color: C.m, marginTop: 6 }}>†includes 48h auto-expiry</div>
        </div>
      </div>
    </Card>
  );
}

function NotificationsCard({ n, ms }: { n: NotificationsSection; ms?: number }) {
  return (
    <Card title={<>Notifications<Timing ms={ms} /></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <Headline value={n.pushSubscribed} sub="push-subscribed users" />
          <Headline value={n.digestEligible} sub="digest-eligible" />
          <div style={{ fontSize: 12, color: C.m }}>Customized prefs <strong style={{ color: C.white }}>{n.customizedPrefs}</strong></div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.m, marginBottom: 8 }}>new_post mode distribution</div>
          <BarList color="#F97316" rows={[
            { label: "all", value: n.newPostModes.all },
            { label: "matches", value: n.newPostModes.matches },
            { label: "digest", value: n.newPostModes.digest },
            { label: "off", value: n.newPostModes.off },
          ]} />
        </div>
      </div>
    </Card>
  );
}
