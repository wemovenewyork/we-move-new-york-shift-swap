import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { calcScore } from "../lib/reputation";
import { nyToday } from "../lib/nyDate";

// Shift-date fixtures must be anchored to the NY calendar date, not NOW().
// shift_date is a DATE column, so NOW() casts through the session timezone
// (UTC on Neon) while the server gate compares against nyToday() — the NY
// calendar date at midnight UTC. Between 20:00 EDT and midnight EDT those
// disagree by a day, so a NOW()-relative offset no longer clears the gate
// and every post-shift test fails. Anchoring to nyToday() makes the fixtures
// hour-of-day independent, which also keeps CI green after 00:00 UTC.
function nyDateMinus(days: number): string {
  return new Date(nyToday().getTime() - days * 86400_000).toISOString().slice(0, 10);
}

// Route-handler tests run against a real Postgres (the Neon preview branch)
// via DATABASE_URL, calling the actual Next.js route handlers with minted
// JWTs — no HTTP server needed.
const DB = !!process.env.DATABASE_URL;
process.env.JWT_SECRET ??= "trust-v2-test-secret";
process.env.CRON_SECRET ??= "trust-v2-test-cron-secret";

// ── calcScore boundaries (pure, always run) ────────────────────────────────

test("calcScore: fewer than 3 settled swaps → New (scenario 6)", () => {
  assert.equal(calcScore({ completed: 0, cancelled: 0, noShow: 0, reviews: [] }).label, "New");
  assert.equal(calcScore({ completed: 1, cancelled: 0, noShow: 0, reviews: [] }).label, "New");
  assert.equal(calcScore({ completed: 2, cancelled: 0, noShow: 0, reviews: [] }).label, "New");
  assert.equal(calcScore({ completed: 1, cancelled: 0, noShow: 0, reviews: [5, 5, 5] }).label, "New");
});

test("calcScore: Elite requires total >= 10, perfect small accounts cap at Trusted", () => {
  const smallPerfect = calcScore({ completed: 3, cancelled: 0, noShow: 0, reviews: [] });
  assert.equal(smallPerfect.score, 100);
  assert.equal(smallPerfect.label, "Trusted"); // not Elite — total < 10
  const bigPerfect = calcScore({ completed: 10, cancelled: 0, noShow: 0, reviews: [] });
  assert.equal(bigPerfect.label, "Elite");
});

test("calcScore: no phantom 5.0 — fewer than 3 reviews means pure reliability", () => {
  // 2/3 completed = 66.67% reliability. Old formula padded with a phantom
  // 5.0 avg to 80; new formula returns reliability alone.
  const r = calcScore({ completed: 2, cancelled: 1, noShow: 0, reviews: [] });
  assert.equal(r.score, 67);
  assert.equal(r.label, "Active");
  // Two 5-star reviews still don't count (threshold is 3).
  assert.equal(calcScore({ completed: 2, cancelled: 1, noShow: 0, reviews: [5, 5] }).score, 67);
  // Three reviews do.
  const withReviews = calcScore({ completed: 2, cancelled: 1, noShow: 0, reviews: [5, 5, 5] });
  assert.equal(withReviews.score, Math.round(66.66666666666666 * 0.6 + 100 * 0.4));
});

// ── DB-backed acceptance scenarios ─────────────────────────────────────────

interface Ctx {
  prisma: typeof import("../lib/prisma").prisma;
  agreementRoute: typeof import("../app/api/swaps/[id]/agreement/route");
  reviewRoute: typeof import("../app/api/swaps/[id]/review/route");
  statusRoute: typeof import("../app/api/swaps/[id]/status/route");
  followupsCron: typeof import("../app/api/cron/agreement-followups/route");
  makeReq: (userId: string, email: string, init?: { method?: string; body?: unknown }) => import("next/server").NextRequest;
  params: (id: string) => { params: Promise<{ id: string }> };
}

async function loadCtx(): Promise<Ctx> {
  const { prisma } = await import("../lib/prisma");
  const { signAccessToken } = await import("../lib/auth");
  const { NextRequest } = await import("next/server");
  const agreementRoute = await import("../app/api/swaps/[id]/agreement/route");
  const reviewRoute = await import("../app/api/swaps/[id]/review/route");
  const statusRoute = await import("../app/api/swaps/[id]/status/route");
  const followupsCron = await import("../app/api/cron/agreement-followups/route");
  const makeReq = (userId: string, email: string, init?: { method?: string; body?: unknown }) =>
    new NextRequest("http://localhost/api/test", {
      method: init?.method ?? "POST",
      headers: {
        authorization: `Bearer ${signAccessToken({ userId, email })}`,
        "content-type": "application/json",
      },
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
  const params = (id: string) => ({ params: Promise.resolve({ id }) });
  return { prisma, agreementRoute, reviewRoute, statusRoute, followupsCron, makeReq, params };
}

interface Seeded {
  tag: string;
  depotId: string;
  owner: { id: string; email: string };
  users: { id: string; email: string }[];
  swapId: string;
}

async function seed(ctx: Ctx, extraUsers = 1): Promise<Seeded> {
  const tag = `t2-${randomUUID().slice(0, 8)}`;
  const depot = await ctx.prisma.depot.create({
    data: { name: tag, code: tag, borough: "Queens", operator: "NYCT" },
  });
  const mk = (n: string) =>
    ctx.prisma.user.create({
      data: { email: `${tag}-${n}@test.invalid`, passwordHash: "x", firstName: n, lastName: "T", depotId: depot.id },
      select: { id: true, email: true },
    });
  const owner = await mk("owner");
  const users = [];
  for (let i = 0; i < extraUsers; i++) users.push(await mk(`u${i}`));
  const swap = await ctx.prisma.swap.create({
    data: {
      userId: owner.id, depotId: depot.id, category: "work",
      details: `${tag} test swap`, posterName: "Owner T", status: "open",
      date: new Date(Date.now() + 30 * 86400_000),
    },
  });
  return { tag, depotId: depot.id, owner, users, swapId: swap.id };
}

async function cleanup(ctx: Ctx, s: Seeded) {
  const userIds = [s.owner.id, ...s.users.map(u => u.id)];
  await ctx.prisma.review.deleteMany({ where: { swapId: s.swapId } });
  await ctx.prisma.swapAgreement.deleteMany({ where: { swapId: s.swapId } });
  await ctx.prisma.swap.deleteMany({ where: { id: s.swapId } });
  await ctx.prisma.reputation.deleteMany({ where: { userId: { in: userIds } } });
  // Notifications created by the routes for the seeded users only.
  await ctx.prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await ctx.prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await ctx.prisma.depot.deleteMany({ where: { id: s.depotId } });
}

async function rep(ctx: Ctx, userId: string) {
  const r = await ctx.prisma.reputation.findUnique({ where: { userId } });
  return { completed: r?.completed ?? 0, cancelled: r?.cancelled ?? 0, noShow: r?.noShow ?? 0 };
}

test("scenario 1: three proposals, swap stays open, accept one → siblings declined, no dings", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 3);
  try {
    for (const u of s.users) {
      const res = await ctx.agreementRoute.POST(ctx.makeReq(u.id, u.email, { body: { note: "mine" } }), ctx.params(s.swapId));
      assert.equal(res.status, 201, `propose by ${u.email}`);
    }
    // Swap still open with 3 pending proposals
    let swap = await ctx.prisma.swap.findUniqueOrThrow({ where: { id: s.swapId } });
    assert.equal(swap.status, "open");
    assert.equal(await ctx.prisma.swapAgreement.count({ where: { swapId: s.swapId, status: "pending" } }), 3);

    // Owner accepts the second proposal specifically
    const target = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId, userAId: s.users[1].id } });
    const acceptRes = await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "accept", agreementId: target.id } }),
      ctx.params(s.swapId),
    );
    assert.equal(acceptRes.status, 200);

    swap = await ctx.prisma.swap.findUniqueOrThrow({ where: { id: s.swapId } });
    assert.equal(swap.status, "pending");
    const accepted = await ctx.prisma.swapAgreement.findUniqueOrThrow({ where: { id: target.id } });
    assert.equal(accepted.status, "accepted");
    assert.ok(accepted.acceptedAt && accepted.shiftDate, "acceptedAt + shiftDate stamped");
    assert.equal(await ctx.prisma.swapAgreement.count({ where: { swapId: s.swapId, status: "declined" } }), 2);

    // No reputation dings anywhere
    for (const u of [s.owner, ...s.users]) {
      const r = await rep(ctx, u.id);
      assert.deepEqual(r, { completed: 0, cancelled: 0, noShow: 0 }, `no dings for ${u.email}`);
    }
  } finally { await cleanup(ctx, s); }
});

test("scenario 2: owner declines a proposal → reputations untouched", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 1);
  try {
    const u = s.users[0];
    await ctx.agreementRoute.POST(ctx.makeReq(u.id, u.email, { body: {} }), ctx.params(s.swapId));
    const proposal = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId } });
    const res = await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "decline", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    assert.equal(res.status, 200);
    assert.equal((await ctx.prisma.swapAgreement.findUniqueOrThrow({ where: { id: proposal.id } })).status, "declined");
    assert.equal((await ctx.prisma.swap.findUniqueOrThrow({ where: { id: s.swapId } })).status, "open");
    assert.deepEqual(await rep(ctx, u.id), { completed: 0, cancelled: 0, noShow: 0 });
    assert.deepEqual(await rep(ctx, s.owner.id), { completed: 0, cancelled: 0, noShow: 0 });
  } finally { await cleanup(ctx, s); }
});

test("scenario 3: accepted party cancels → canceller +1 cancelled, swap reopens", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 1);
  try {
    const u = s.users[0];
    await ctx.agreementRoute.POST(ctx.makeReq(u.id, u.email, { body: {} }), ctx.params(s.swapId));
    const proposal = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId } });
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "accept", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    // Proposer backs out of the accepted agreement
    const res = await ctx.agreementRoute.PATCH(
      ctx.makeReq(u.id, u.email, { method: "PATCH", body: { action: "cancel", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    assert.equal(res.status, 200);
    assert.equal((await ctx.prisma.swap.findUniqueOrThrow({ where: { id: s.swapId } })).status, "open");
    assert.deepEqual(await rep(ctx, u.id), { completed: 0, cancelled: 1, noShow: 0 });
    assert.deepEqual(await rep(ctx, s.owner.id), { completed: 0, cancelled: 0, noShow: 0 });
  } finally { await cleanup(ctx, s); }
});

test("scenario 4: both confirm post-shift → both +1 completed; one review each; second review 409", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 1);
  try {
    const u = s.users[0];
    await ctx.agreementRoute.POST(ctx.makeReq(u.id, u.email, { body: {} }), ctx.params(s.swapId));
    const proposal = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId } });
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "accept", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );

    // Shift must be past before post-shift answers are accepted (server gate)
    await ctx.prisma.$executeRaw`UPDATE "swap_agreements" SET "shift_date" = ${nyDateMinus(1)}::date WHERE "id" = ${proposal.id}`;

    const r1 = await ctx.agreementRoute.PATCH(
      ctx.makeReq(u.id, u.email, { method: "PATCH", body: { action: "confirm_happened", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    assert.equal(r1.status, 200);
    const r2 = await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "confirm_happened", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    assert.equal(r2.status, 200);

    const done = await ctx.prisma.swapAgreement.findUniqueOrThrow({ where: { id: proposal.id } });
    assert.equal(done.status, "completed");
    assert.equal((await ctx.prisma.swap.findUniqueOrThrow({ where: { id: s.swapId } })).status, "filled");
    assert.deepEqual(await rep(ctx, u.id), { completed: 1, cancelled: 0, noShow: 0 });
    assert.deepEqual(await rep(ctx, s.owner.id), { completed: 1, cancelled: 0, noShow: 0 });

    // One review each accepted; duplicates rejected with 409
    const rv1 = await ctx.reviewRoute.POST(ctx.makeReq(u.id, u.email, { body: { rating: 5 } }), ctx.params(s.swapId));
    assert.equal(rv1.status, 201);
    const rv2 = await ctx.reviewRoute.POST(ctx.makeReq(s.owner.id, s.owner.email, { body: { rating: 4 } }), ctx.params(s.swapId));
    assert.equal(rv2.status, 201);
    const dup = await ctx.reviewRoute.POST(ctx.makeReq(u.id, u.email, { body: { rating: 1 } }), ctx.params(s.swapId));
    assert.equal(dup.status, 409);
  } finally { await cleanup(ctx, s); }
});

test("scenario 5 (conservative): yes-answer + 7d silence → completed, responder +1 completed, NO noShow", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 1);
  try {
    const u = s.users[0];
    await ctx.agreementRoute.POST(ctx.makeReq(u.id, u.email, { body: {} }), ctx.params(s.swapId));
    const proposal = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId } });
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "accept", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    // Backdate the shift 8 days (opens the answer gate AND the cron's 7-day
    // finalize window), then the proposer answers "it happened"; owner silent.
    await ctx.prisma.$executeRaw`UPDATE "swap_agreements" SET "shift_date" = ${nyDateMinus(8)}::date WHERE "id" = ${proposal.id}`;
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(u.id, u.email, { method: "PATCH", body: { action: "confirm_happened", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );

    const { NextRequest } = await import("next/server");
    const cronRes = await ctx.followupsCron.GET(
      new NextRequest("http://localhost/api/cron/agreement-followups", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
    assert.equal(cronRes.status, 200);

    const finalized = await ctx.prisma.swapAgreement.findUniqueOrThrow({ where: { id: proposal.id } });
    assert.equal(finalized.status, "completed"); // the one answer said it happened
    // Conservative rule: silence alone never earns a noShow. The responder's
    // yes-answer completes the swap and credits the responder only.
    assert.deepEqual(await rep(ctx, s.owner.id), { completed: 0, cancelled: 0, noShow: 0 }, "silent owner is NOT auto-noShowed on a yes-answer");
    assert.deepEqual(await rep(ctx, u.id), { completed: 1, cancelled: 0, noShow: 0 }, "responder earns the completed credit");
  } finally { await cleanup(ctx, s); }
});

test("locked decision: both silent 7 days → completed-unverified, zero reputation writes", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 1);
  try {
    const u = s.users[0];
    await ctx.agreementRoute.POST(ctx.makeReq(u.id, u.email, { body: {} }), ctx.params(s.swapId));
    const proposal = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId } });
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "accept", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    await ctx.prisma.$executeRaw`UPDATE "swap_agreements" SET "shift_date" = ${nyDateMinus(8)}::date WHERE "id" = ${proposal.id}`;

    const { NextRequest } = await import("next/server");
    await ctx.followupsCron.GET(
      new NextRequest("http://localhost/api/cron/agreement-followups", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
    const finalized = await ctx.prisma.swapAgreement.findUniqueOrThrow({ where: { id: proposal.id } });
    assert.equal(finalized.status, "completed");
    assert.deepEqual(await rep(ctx, u.id), { completed: 0, cancelled: 0, noShow: 0 });
    assert.deepEqual(await rep(ctx, s.owner.id), { completed: 0, cancelled: 0, noShow: 0 });
  } finally { await cleanup(ctx, s); }
});

test("conflict paths: decline-after-accept 409; double answer 409; duplicate proposal 409; reopen blocked 409", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 2);
  try {
    const [u1, u2] = s.users;
    await ctx.agreementRoute.POST(ctx.makeReq(u1.id, u1.email, { body: {} }), ctx.params(s.swapId));
    // Duplicate pending proposal from the same user → 409 (partial unique)
    const dup = await ctx.agreementRoute.POST(ctx.makeReq(u1.id, u1.email, { body: {} }), ctx.params(s.swapId));
    assert.equal(dup.status, 409);
    await ctx.agreementRoute.POST(ctx.makeReq(u2.id, u2.email, { body: {} }), ctx.params(s.swapId));

    const p1 = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId, userAId: u1.id } });
    const p2 = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId, userAId: u2.id } });

    await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "accept", agreementId: p1.id } }),
      ctx.params(s.swapId),
    );
    // p2 was auto-declined; declining it again → 409 (no longer pending)
    const lateDecline = await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "decline", agreementId: p2.id } }),
      ctx.params(s.swapId),
    );
    assert.equal(lateDecline.status, 409);

    // Owner can't quietly reopen the swap around the accepted agreement
    const reopen = await ctx.statusRoute.PUT(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PUT", body: { status: "open" } }),
      ctx.params(s.swapId),
    );
    assert.equal(reopen.status, 409);

    // Double post-shift answer by the same user → 409
    await ctx.prisma.$executeRaw`UPDATE "swap_agreements" SET "shift_date" = ${nyDateMinus(1)}::date WHERE "id" = ${p1.id}`;
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(u1.id, u1.email, { method: "PATCH", body: { action: "confirm_happened", agreementId: p1.id } }),
      ctx.params(s.swapId),
    );
    const again = await ctx.agreementRoute.PATCH(
      ctx.makeReq(u1.id, u1.email, { method: "PATCH", body: { action: "report_noshow", agreementId: p1.id } }),
      ctx.params(s.swapId),
    );
    assert.equal(again.status, 409);
  } finally { await cleanup(ctx, s); }
});

test("disputed: split answers → disputed status, no reputation writes", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 1);
  try {
    const u = s.users[0];
    await ctx.agreementRoute.POST(ctx.makeReq(u.id, u.email, { body: {} }), ctx.params(s.swapId));
    const proposal = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId } });
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "accept", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    // Shift must be past before post-shift answers are accepted (server gate)
    await ctx.prisma.$executeRaw`UPDATE "swap_agreements" SET "shift_date" = ${nyDateMinus(1)}::date WHERE "id" = ${proposal.id}`;
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(u.id, u.email, { method: "PATCH", body: { action: "confirm_happened", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "report_noshow", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    const row = await ctx.prisma.swapAgreement.findUniqueOrThrow({ where: { id: proposal.id } });
    assert.equal(row.status, "disputed");
    assert.deepEqual(await rep(ctx, u.id), { completed: 0, cancelled: 0, noShow: 0 });
    assert.deepEqual(await rep(ctx, s.owner.id), { completed: 0, cancelled: 0, noShow: 0 });
  } finally { await cleanup(ctx, s); }
});

test("gate: instant mutual confirm on a future-dated agreement → 400, no reputation change", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 1);
  try {
    const u = s.users[0];
    await ctx.agreementRoute.POST(ctx.makeReq(u.id, u.email, { body: {} }), ctx.params(s.swapId));
    const proposal = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId } });
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "accept", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    // Shift is 30 days out — both instant confirms must be rejected.
    for (const who of [u, s.owner]) {
      const res = await ctx.agreementRoute.PATCH(
        ctx.makeReq(who.id, who.email, { method: "PATCH", body: { action: "confirm_happened", agreementId: proposal.id } }),
        ctx.params(s.swapId),
      );
      assert.equal(res.status, 400, `instant confirm by ${who.email} rejected`);
    }
    const row = await ctx.prisma.swapAgreement.findUniqueOrThrow({ where: { id: proposal.id } });
    assert.equal(row.status, "accepted");
    assert.equal(row.userAHappened, null);
    assert.equal(row.userBHappened, null);
    assert.deepEqual(await rep(ctx, u.id), { completed: 0, cancelled: 0, noShow: 0 });
    assert.deepEqual(await rep(ctx, s.owner.id), { completed: 0, cancelled: 0, noShow: 0 });
  } finally { await cleanup(ctx, s); }
});

test("conservative finalize: noshow-report + 7d silence → cancelled, silent party +1 noShow", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const s = await seed(ctx, 1);
  try {
    const u = s.users[0];
    await ctx.agreementRoute.POST(ctx.makeReq(u.id, u.email, { body: {} }), ctx.params(s.swapId));
    const proposal = await ctx.prisma.swapAgreement.findFirstOrThrow({ where: { swapId: s.swapId } });
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(s.owner.id, s.owner.email, { method: "PATCH", body: { action: "accept", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    await ctx.prisma.$executeRaw`UPDATE "swap_agreements" SET "shift_date" = ${nyDateMinus(8)}::date WHERE "id" = ${proposal.id}`;
    // Proposer explicitly reports a no-show; owner stays silent 7+ days.
    await ctx.agreementRoute.PATCH(
      ctx.makeReq(u.id, u.email, { method: "PATCH", body: { action: "report_noshow", agreementId: proposal.id } }),
      ctx.params(s.swapId),
    );
    const { NextRequest } = await import("next/server");
    await ctx.followupsCron.GET(
      new NextRequest("http://localhost/api/cron/agreement-followups", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
    const finalized = await ctx.prisma.swapAgreement.findUniqueOrThrow({ where: { id: proposal.id } });
    assert.equal(finalized.status, "cancelled");
    assert.deepEqual(await rep(ctx, s.owner.id), { completed: 0, cancelled: 0, noShow: 1 }, "silent party is noShowed on an explicit report");
    assert.deepEqual(await rep(ctx, u.id), { completed: 0, cancelled: 0, noShow: 0 }, "reporter unaffected");
  } finally { await cleanup(ctx, s); }
});
