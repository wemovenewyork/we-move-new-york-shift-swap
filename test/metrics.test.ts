import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { truncBucket, generateBuckets, timed } from "../lib/metrics";

const DB = !!process.env.DATABASE_URL;
process.env.JWT_SECRET ??= "metrics-test-secret";

// ── bucket math (pure) ──────────────────────────────────────────────────────

test("truncBucket: day = UTC midnight, week = Monday", () => {
  assert.equal(truncBucket(new Date("2026-07-15T18:30:00Z"), "day"), "2026-07-15");
  // 2026-07-15 is a Wednesday → Monday is 2026-07-13
  assert.equal(truncBucket(new Date("2026-07-15T18:30:00Z"), "week"), "2026-07-13");
  assert.equal(truncBucket(new Date("2026-07-13T00:00:00Z"), "week"), "2026-07-13");
});

test("generateBuckets: continuous axis, no gaps", () => {
  const days = generateBuckets(new Date("2026-07-10T00:00:00Z"), new Date("2026-07-13T12:00:00Z"), "day");
  assert.deepEqual(days, ["2026-07-10", "2026-07-11", "2026-07-12", "2026-07-13"]);
  const weeks = generateBuckets(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-20T00:00:00Z"), "week");
  assert.ok(weeks.length >= 3 && weeks[0] <= "2026-06-29");
});

// ── per-section degradation (pure) ──────────────────────────────────────────

test("timed: success records timing and returns value; failure degrades to null + errors", async () => {
  const timings: Record<string, number> = {};
  const errors: string[] = [];
  const okv = await timed(async () => 42, "growth", timings, errors);
  assert.equal(okv, 42);
  assert.ok(typeof timings.growth === "number");
  assert.equal(errors.length, 0);

  const bad = await timed(async () => { throw new Error("boom"); }, "trust", timings, errors);
  assert.equal(bad, null, "throwing section degrades to null");
  assert.deepEqual(errors, ["trust"], "error key recorded");
  assert.ok(typeof timings.trust === "number", "timing recorded even on failure");
});

// ── heartbeat (pure, mocked fetch) ──────────────────────────────────────────

test("pingHeartbeat: no-op when HEARTBEAT_URL_BASE unset", async () => {
  const { pingHeartbeat } = await import("../lib/heartbeat");
  const prev = process.env.HEARTBEAT_URL_BASE;
  delete process.env.HEARTBEAT_URL_BASE;
  let called = false;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { called = true; return new Response("ok"); }) as typeof fetch;
  try {
    await pingHeartbeat("expire-swaps");
    assert.equal(called, false, "fetch not called when env unset");
  } finally {
    globalThis.fetch = realFetch;
    if (prev !== undefined) process.env.HEARTBEAT_URL_BASE = prev;
  }
});

test("pingHeartbeat: pings ${base}/${slug} exactly once when set", async () => {
  const { pingHeartbeat } = await import("../lib/heartbeat");
  const prev = process.env.HEARTBEAT_URL_BASE;
  process.env.HEARTBEAT_URL_BASE = "https://hc.example/uuid/";
  const urls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (u: string) => { urls.push(String(u)); return new Response("ok"); }) as unknown as typeof fetch;
  try {
    await pingHeartbeat("daily-digest");
    assert.deepEqual(urls, ["https://hc.example/uuid/daily-digest"], "trailing slash normalized, slug appended");
  } finally {
    globalThis.fetch = realFetch;
    if (prev !== undefined) process.env.HEARTBEAT_URL_BASE = prev; else delete process.env.HEARTBEAT_URL_BASE;
  }
});

test("pingHeartbeat: never throws even if fetch rejects", async () => {
  const { pingHeartbeat } = await import("../lib/heartbeat");
  const prev = process.env.HEARTBEAT_URL_BASE;
  process.env.HEARTBEAT_URL_BASE = "https://hc.example/uuid";
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as typeof fetch;
  try {
    await assert.doesNotReject(pingHeartbeat("cleanup-swaps"));
  } finally {
    globalThis.fetch = realFetch;
    if (prev !== undefined) process.env.HEARTBEAT_URL_BASE = prev; else delete process.env.HEARTBEAT_URL_BASE;
  }
});

// ── API auth + range + DB-gated correctness ─────────────────────────────────

async function apiCtx() {
  const { prisma } = await import("../lib/prisma");
  const { GET } = await import("../app/api/admin/metrics/route");
  const { signAccessToken } = await import("../lib/auth");
  const { NextRequest } = await import("next/server");
  return { prisma, GET, signAccessToken, NextRequest };
}

test("metrics API: auth + range validation", { skip: !DB }, async () => {
  const { prisma, GET, signAccessToken, NextRequest } = await apiCtx();
  const tag = `mx${randomUUID().slice(0, 6)}`;
  const admin = await prisma.user.create({ data: { email: `${tag}-a@test.invalid`, passwordHash: "x", firstName: "A", lastName: "D", role: "admin" }, select: { id: true, email: true } });
  const op = await prisma.user.create({ data: { email: `${tag}-o@test.invalid`, passwordHash: "x", firstName: "O", lastName: "P", role: "operator" }, select: { id: true, email: true } });
  const req = (userId: string | null, email: string, range?: string) =>
    new NextRequest(`http://localhost/api/admin/metrics${range !== undefined ? `?range=${range}` : ""}`,
      userId ? { headers: { authorization: `Bearer ${signAccessToken({ userId, email })}` } } : {});
  try {
    assert.equal((await GET(req(null, ""))).status, 401, "no token → 401");
    assert.equal((await GET(req(op.id, op.email))).status, 403, "operator → 403");
    assert.equal((await GET(req(admin.id, admin.email, "bogus"))).status, 400, "bad range → 400");
    const okRes = await GET(req(admin.id, admin.email, "30d"));
    assert.equal(okRes.status, 200, "admin + valid range → 200");
    const body = await okRes.json();
    assert.equal(body.meta.range, "30d");
    assert.ok(["growth", "marketplace", "trust", "notifications"].every((k) => k in body));
  } finally {
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
  }
});

test("metrics correctness: time-to-fill, response split, signupSource bucket", { skip: !DB }, async () => {
  const { prisma } = await import("../lib/prisma");
  const { buildMetrics } = await import("../lib/metrics");
  const tag = `mx${randomUUID().slice(0, 6)}`;
  const depot = await prisma.depot.create({ data: { name: tag, code: tag, borough: "Q", operator: "NYCT" } });
  const mk = (n: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { email: `${tag}-${n}@test.invalid`, passwordHash: "x", firstName: n, lastName: "T", depotId: depot.id, ...extra }, select: { id: true } });
  try {
    // signupSource user in-range → attribution bucket
    await mk("shared", { signupSource: "share" });
    const owner = await mk("owner");
    const taker = await mk("taker");

    // Swap created 3d ago, agreement accepted exactly 2h later, completed → 2h to fill
    const created = new Date(Date.now() - 3 * 86400_000);
    const swap = await prisma.swap.create({ data: { userId: owner.id, depotId: depot.id, category: "work", status: "filled", posterName: "O T", details: "d", createdAt: created } });
    await prisma.$executeRaw`UPDATE "swaps" SET "created_at" = ${created} WHERE "id" = ${swap.id}`;
    await prisma.swapAgreement.create({ data: { swapId: swap.id, userAId: taker.id, userBId: owner.id, status: "completed", acceptedAt: new Date(created.getTime() + 2 * 3600_000), completedAt: new Date(), userAHappened: true, userBHappened: true, shiftDate: new Date(Date.now() - 86400_000) } });

    // A finalized-SILENT agreement (completed, no answers) → completedUnverified.
    // Same clean 2h fill latency so the median stays ~2h.
    const accepted2 = new Date(Date.now() - 2 * 86400_000);
    const created2 = new Date(accepted2.getTime() - 2 * 3600_000);
    const swap2 = await prisma.swap.create({ data: { userId: owner.id, depotId: depot.id, category: "work", status: "filled", posterName: "O T", details: "d2", createdAt: created2 } });
    await prisma.$executeRaw`UPDATE "swaps" SET "created_at" = ${created2} WHERE "id" = ${swap2.id}`;
    await prisma.swapAgreement.create({ data: { swapId: swap2.id, userAId: taker.id, userBId: owner.id, status: "completed", acceptedAt: accepted2, completedAt: new Date() } });

    const m = await buildMetrics("30d");
    assert.ok(m.marketplace, "marketplace section present");
    assert.ok(m.marketplace!.hoursToFill.median != null && Math.abs(m.marketplace!.hoursToFill.median - 2) < 0.5, `median ~2h, got ${m.marketplace!.hoursToFill.median}`);

    assert.ok(m.trust, "trust section present");
    assert.ok(m.trust!.outcomeSplit.completedConfirmed >= 1, "answered agreement → completedConfirmed");
    assert.ok(m.trust!.outcomeSplit.completedUnverified >= 1, "silent agreement → completedUnverified");
    assert.ok(m.trust!.postShiftResponseRate != null && m.trust!.postShiftResponseRate >= 0 && m.trust!.postShiftResponseRate <= 1, "response rate is a fraction");

    assert.ok(m.growth, "growth section present");
    const share = m.growth!.signupsBySource.find((r) => r.source === "share");
    assert.ok(share && share.count >= 1, "signupSource=share bucketed");
  } finally {
    const users = await prisma.user.findMany({ where: { email: { startsWith: tag } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    await prisma.swapAgreement.deleteMany({ where: { swap: { depotId: depot.id } } });
    await prisma.swap.deleteMany({ where: { depotId: depot.id } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.depot.deleteMany({ where: { id: depot.id } });
  }
});
