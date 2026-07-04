import { prisma } from "@/lib/prisma";
import { mergePrefs } from "@/lib/notificationPrefs";
import { Prisma } from "@prisma/client";

// Read-only admin metrics aggregation. Zero writes. Each section is wrapped so
// a single failing aggregation degrades to null (+ Sentry) instead of 500ing
// the whole dashboard. Time buckets: daily for 7d, weekly for 30d/90d.

export type Range = "7d" | "30d" | "90d";
export const RANGES: Range[] = ["7d", "30d", "90d"];

export function rangeDays(r: Range): number {
  return r === "7d" ? 7 : r === "30d" ? 30 : 90;
}
export function bucketUnit(r: Range): "day" | "week" {
  return r === "7d" ? "day" : "week";
}

export interface Series { buckets: string[]; values: number[] }

/** Postgres date_trunc-compatible bucket key (UTC midnight; week = Monday). */
export function truncBucket(d: Date, unit: "day" | "week"): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (unit === "week") {
    const dow = (x.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    x.setUTCDate(x.getUTCDate() - dow);
  }
  return x.toISOString().slice(0, 10);
}

/** Continuous bucket axis from `start` to now, so zero-activity buckets show. */
export function generateBuckets(start: Date, now: Date, unit: "day" | "week"): string[] {
  const keys: string[] = [];
  const cur = new Date(`${truncBucket(start, unit)}T00:00:00Z`);
  const end = new Date(`${truncBucket(now, unit)}T00:00:00Z`);
  while (cur <= end) {
    keys.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + (unit === "week" ? 7 : 1));
  }
  return keys;
}

/** Map (bucketKey→count) rows onto the continuous axis; missing = 0. */
function toSeries(buckets: string[], rows: { bucket: string; c: number }[]): Series {
  const m = new Map(rows.map((r) => [r.bucket, r.c]));
  return { buckets, values: buckets.map((b) => m.get(b) ?? 0) };
}

function num(v: unknown): number {
  return typeof v === "bigint" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0);
}

// ── section result shapes ───────────────────────────────────────────────────

export interface GrowthSection {
  signups: Series;
  signupsBySource: { source: string; count: number }[];
  totalUsers: number;
  activeUsers: Series;
}
export interface MarketplaceSection {
  posted: Series; filled: Series; expired: Series;
  fillRate: number | null; // filled ÷ posted over the range (same-bucket approx)
  hoursToFill: { median: number | null; p90: number | null };
  openByCategory: { category: string; count: number }[];
  openByDepot: { depot: string; count: number }[];
}
export interface TrustSection {
  proposals: Series;
  // NOTE: "declined" conflates owner-decline and 48h auto-expiry (same status);
  // "withdrawn" = proposer-cancelled pending. See work-order deviation note.
  proposalSplit: { accepted: number; declined: number; withdrawn: number; pending: number };
  proposalsPerFilledSwap: number | null;
  postShiftResponseRate: number | null; // answered ÷ finalized (accepted-onward)
  outcomeSplit: { completedConfirmed: number; completedUnverified: number; disputed: number; cancelled: number };
  reviewSubmissionRate: number | null;
  avgRating: number | null;
}
export interface NotificationsSection {
  customizedPrefs: number; // prefs JSON non-null
  newPostModes: { all: number; matches: number; digest: number; off: number };
  pushSubscribed: number;
  digestEligible: number;
}
export interface MetricsResponse {
  growth: GrowthSection | null;
  marketplace: MarketplaceSection | null;
  trust: TrustSection | null;
  notifications: NotificationsSection | null;
  meta: {
    generatedAt: string;
    range: Range;
    bucketUnit: "day" | "week";
    timings: Record<string, number>;
    errors: string[];
  };
}

// Bucketed count via date_trunc. `unit` is a validated literal (never user
// input), start is parameterized.
async function bucketCounts(
  table: string, tsCol: string, unit: "day" | "week", start: Date, extraWhere = "",
): Promise<{ bucket: string; c: number }[]> {
  const sql = `SELECT to_char(date_trunc('${unit}', "${tsCol}"), 'YYYY-MM-DD') AS bucket, COUNT(*)::bigint AS c
    FROM "${table}" WHERE "${tsCol}" >= $1 ${extraWhere} GROUP BY 1 ORDER BY 1`;
  const rows = await prisma.$queryRawUnsafe<{ bucket: string; c: bigint }[]>(sql, start);
  return rows.map((r) => ({ bucket: r.bucket, c: num(r.c) }));
}

async function growth(unit: "day" | "week", start: Date, buckets: string[]): Promise<GrowthSection> {
  const [signupRows, bySource, totalUsers, activeRows] = await Promise.all([
    bucketCounts("users", "created_at", unit, start),
    prisma.user.groupBy({ by: ["signupSource"], _count: { _all: true } }),
    prisma.user.count(),
    prisma.$queryRawUnsafe<{ bucket: string; c: bigint }[]>(
      `SELECT to_char(date_trunc('${unit}', ts), 'YYYY-MM-DD') AS bucket, COUNT(DISTINCT uid)::bigint AS c FROM (
         SELECT created_at ts, user_id uid FROM "swaps" WHERE created_at >= $1
         UNION ALL SELECT created_at, from_user_id FROM "messages" WHERE created_at >= $1
         UNION ALL SELECT created_at, user_a_id FROM "swap_agreements" WHERE created_at >= $1
         UNION ALL SELECT user_a_at, user_a_id FROM "swap_agreements" WHERE user_a_at >= $1
         UNION ALL SELECT user_b_at, user_b_id FROM "swap_agreements" WHERE user_b_at >= $1
         UNION ALL SELECT created_at, reviewer_id FROM "reviews" WHERE created_at >= $1
       ) t GROUP BY 1 ORDER BY 1`, start),
  ]);
  return {
    signups: toSeries(buckets, signupRows),
    signupsBySource: bySource
      .map((r) => ({ source: r.signupSource ?? "organic", count: num(r._count._all) }))
      .sort((a, b) => b.count - a.count),
    totalUsers: num(totalUsers),
    activeUsers: toSeries(buckets, activeRows.map((r) => ({ bucket: r.bucket, c: num(r.c) }))),
  };
}

async function marketplace(unit: "day" | "week", start: Date, buckets: string[]): Promise<MarketplaceSection> {
  const [swapRows, latency, byCat, byDepotRows] = await Promise.all([
    prisma.$queryRawUnsafe<{ bucket: string; posted: bigint; filled: bigint; expired: bigint }[]>(
      `SELECT to_char(date_trunc('${unit}', created_at), 'YYYY-MM-DD') AS bucket,
         COUNT(*)::bigint AS posted,
         COUNT(*) FILTER (WHERE status = 'filled')::bigint AS filled,
         COUNT(*) FILTER (WHERE status = 'expired')::bigint AS expired
       FROM "swaps" WHERE created_at >= $1 GROUP BY 1 ORDER BY 1`, start),
    prisma.$queryRawUnsafe<{ median: number | null; p90: number | null }[]>(
      `SELECT
         percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (a.accepted_at - s.created_at)) / 3600) AS median,
         percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (a.accepted_at - s.created_at)) / 3600) AS p90
       FROM "swap_agreements" a JOIN "swaps" s ON s.id = a.swap_id
       WHERE a.accepted_at IS NOT NULL AND a.accepted_at >= $1 AND a.status IN ('accepted','completed')`, start),
    prisma.swap.groupBy({ by: ["category"], where: { status: "open", archivedAt: null }, _count: { _all: true } }),
    prisma.swap.groupBy({ by: ["depotId"], where: { status: "open", archivedAt: null }, _count: { _all: true } }),
  ]);

  const posted = toSeries(buckets, swapRows.map((r) => ({ bucket: r.bucket, c: num(r.posted) })));
  const filled = toSeries(buckets, swapRows.map((r) => ({ bucket: r.bucket, c: num(r.filled) })));
  const expired = toSeries(buckets, swapRows.map((r) => ({ bucket: r.bucket, c: num(r.expired) })));
  const totPosted = posted.values.reduce((a, b) => a + b, 0);
  const totFilled = filled.values.reduce((a, b) => a + b, 0);

  const topDepots = [...byDepotRows].sort((a, b) => num(b._count._all) - num(a._count._all)).slice(0, 10);
  const depotNames = topDepots.length
    ? await prisma.depot.findMany({ where: { id: { in: topDepots.map((d) => d.depotId) } }, select: { id: true, name: true, code: true } })
    : [];
  const nameOf = new Map(depotNames.map((d) => [d.id, d.name || d.code]));

  return {
    posted, filled, expired,
    fillRate: totPosted > 0 ? totFilled / totPosted : null,
    hoursToFill: { median: latency[0]?.median ?? null, p90: latency[0]?.p90 ?? null },
    openByCategory: byCat.map((r) => ({ category: r.category, count: num(r._count._all) })).sort((a, b) => b.count - a.count),
    openByDepot: topDepots.map((d) => ({ depot: nameOf.get(d.depotId) ?? d.depotId, count: num(d._count._all) })),
  };
}

async function trust(unit: "day" | "week", start: Date, buckets: string[]): Promise<TrustSection> {
  const [proposalRows, split, filledCount, finalized, reviewAgg] = await Promise.all([
    bucketCounts("swap_agreements", "created_at", unit, start),
    prisma.swapAgreement.groupBy({ by: ["status"], where: { createdAt: { gte: start } }, _count: { _all: true } }),
    prisma.swap.count({ where: { status: "filled", createdAt: { gte: start } } }),
    // Finalized post-shift agreements in range (terminal states reached after acceptance).
    prisma.$queryRawUnsafe<{
      finalized: bigint; answered: bigint;
      completed_confirmed: bigint; completed_unverified: bigint; disputed: bigint; cancelled: bigint;
    }[]>(
      `SELECT
         COUNT(*)::bigint AS finalized,
         COUNT(*) FILTER (WHERE user_a_happened IS NOT NULL OR user_b_happened IS NOT NULL)::bigint AS answered,
         COUNT(*) FILTER (WHERE status = 'completed' AND (user_a_happened IS NOT NULL OR user_b_happened IS NOT NULL))::bigint AS completed_confirmed,
         COUNT(*) FILTER (WHERE status = 'completed' AND user_a_happened IS NULL AND user_b_happened IS NULL)::bigint AS completed_unverified,
         COUNT(*) FILTER (WHERE status = 'disputed')::bigint AS disputed,
         COUNT(*) FILTER (WHERE status = 'cancelled' AND accepted_at IS NOT NULL)::bigint AS cancelled
       FROM "swap_agreements"
       WHERE accepted_at IS NOT NULL AND accepted_at >= $1
         AND status IN ('completed','disputed','cancelled')`, start),
    prisma.review.aggregate({ where: { createdAt: { gte: start } }, _count: { _all: true }, _avg: { rating: true } }),
  ]);

  const byStatus = (s: string) => num(split.find((r) => r.status === s)?._count._all ?? 0);
  const proposalCount = proposalRows.reduce((a, r) => a + r.c, 0);
  const f = finalized[0];
  const finalizedN = num(f?.finalized ?? 0);
  const completedConfirmed = num(f?.completed_confirmed ?? 0);
  const reviewCount = num(reviewAgg._count._all);

  return {
    proposals: toSeries(buckets, proposalRows),
    proposalSplit: {
      accepted: byStatus("accepted") + byStatus("completed") + byStatus("disputed"),
      declined: byStatus("declined"),
      withdrawn: byStatus("cancelled"),
      pending: byStatus("pending"),
    },
    proposalsPerFilledSwap: filledCount > 0 ? proposalCount / filledCount : null,
    postShiftResponseRate: finalizedN > 0 ? num(f?.answered ?? 0) / finalizedN : null,
    outcomeSplit: {
      completedConfirmed,
      completedUnverified: num(f?.completed_unverified ?? 0),
      disputed: num(f?.disputed ?? 0),
      cancelled: num(f?.cancelled ?? 0),
    },
    // Two participants per confirmed agreement are review-eligible.
    reviewSubmissionRate: completedConfirmed > 0 ? reviewCount / (completedConfirmed * 2) : null,
    avgRating: reviewAgg._avg.rating ?? null,
  };
}

async function notifications(): Promise<NotificationsSection> {
  const [customized, prefsRows, pushSubs] = await Promise.all([
    prisma.user.count({ where: { notificationPrefs: { not: Prisma.JsonNull } } }),
    prisma.user.findMany({ select: { notificationPrefs: true } }),
    prisma.pushSubscription.findMany({ select: { userId: true }, distinct: ["userId"] }),
  ]);

  const modes = { all: 0, matches: 0, digest: 0, off: 0 };
  let digestEligible = 0;
  for (const u of prefsRows) {
    const p = mergePrefs(u.notificationPrefs);
    modes[p.new_post] += 1;
    if (p.digest && p.new_post !== "off") digestEligible += 1;
  }
  return {
    customizedPrefs: num(customized),
    newPostModes: modes,
    pushSubscribed: pushSubs.length,
    digestEligible,
  };
}


async function timed<T>(fn: () => Promise<T>, key: string, timings: Record<string, number>, errors: string[]): Promise<T | null> {
  const t0 = Date.now();
  try {
    const r = await fn();
    timings[key] = Date.now() - t0;
    return r;
  } catch (e) {
    timings[key] = Date.now() - t0;
    errors.push(key);
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(e, { tags: { source: "admin-metrics", section: key } });
    return null;
  }
}

export async function buildMetrics(range: Range, now: Date = new Date()): Promise<MetricsResponse> {
  const unit = bucketUnit(range);
  const start = new Date(now.getTime() - rangeDays(range) * 86400_000);
  const buckets = generateBuckets(start, now, unit);
  const timings: Record<string, number> = {};
  const errors: string[] = [];

  // Sections run in parallel; each degrades independently.
  const [g, m, t, n] = await Promise.all([
    timed(() => growth(unit, start, buckets), "growth", timings, errors),
    timed(() => marketplace(unit, start, buckets), "marketplace", timings, errors),
    timed(() => trust(unit, start, buckets), "trust", timings, errors),
    timed(() => notifications(), "notifications", timings, errors),
  ]);

  return {
    growth: g, marketplace: m, trust: t, notifications: n,
    meta: { generatedAt: now.toISOString(), range, bucketUnit: unit, timings, errors },
  };
}
