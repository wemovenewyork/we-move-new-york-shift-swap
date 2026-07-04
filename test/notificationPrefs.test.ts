import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  DEFAULT_PREFS,
  mergePrefs,
  isQuietNow,
  validatePrefsUpdate,
} from "../lib/notificationPrefs";

const DB = !!process.env.DATABASE_URL;
process.env.JWT_SECRET ??= "notif-test-secret";
process.env.CRON_SECRET ??= "notif-test-cron-secret";

// ── isQuietNow boundaries (July = EDT = UTC-4) ──────────────────────────────
// NY 23:00 on Jul 10 = 2026-07-11T03:00:00Z, NY 12:00 = 16:00Z, etc.

const nyInstant = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2026, 6, 10, h + 4, m, 0)); // EDT offset +4
};

test("isQuietNow: simple window — inside, outside, at-edges", () => {
  // 13:00 → 15:00 NY
  assert.equal(isQuietNow("13:00", "15:00", nyInstant("14:00")), true, "inside");
  assert.equal(isQuietNow("13:00", "15:00", nyInstant("12:59")), false, "before");
  assert.equal(isQuietNow("13:00", "15:00", nyInstant("15:01")), false, "after");
  assert.equal(isQuietNow("13:00", "15:00", nyInstant("13:00")), true, "start edge inclusive");
  assert.equal(isQuietNow("13:00", "15:00", nyInstant("15:00")), false, "end edge exclusive");
});

test("isQuietNow: wrap-around window 22:00 → 07:00", () => {
  assert.equal(isQuietNow("22:00", "07:00", nyInstant("23:30")), true, "late night");
  assert.equal(isQuietNow("22:00", "07:00", nyInstant("03:00")), true, "early morning");
  assert.equal(isQuietNow("22:00", "07:00", nyInstant("12:00")), false, "midday");
  assert.equal(isQuietNow("22:00", "07:00", nyInstant("22:00")), true, "start edge inclusive");
  assert.equal(isQuietNow("22:00", "07:00", nyInstant("07:00")), false, "end edge exclusive");
});

test("isQuietNow: null / invalid / degenerate config = no quiet hours", () => {
  assert.equal(isQuietNow(null, null, nyInstant("23:00")), false);
  assert.equal(isQuietNow("22:00", null, nyInstant("23:00")), false);
  assert.equal(isQuietNow(null, "07:00", nyInstant("23:00")), false);
  assert.equal(isQuietNow("25:00", "07:00", nyInstant("23:00")), false, "invalid start");
  assert.equal(isQuietNow("22:00", "07:60", nyInstant("23:00")), false, "invalid end");
  assert.equal(isQuietNow("09:00", "09:00", nyInstant("09:00")), false, "degenerate window");
});

// ── Prefs merge + validation ────────────────────────────────────────────────

test("mergePrefs: empty/null → defaults (new_post default is digest)", () => {
  assert.deepEqual(mergePrefs(null), DEFAULT_PREFS);
  assert.deepEqual(mergePrefs({}), DEFAULT_PREFS);
  assert.equal(DEFAULT_PREFS.new_post, "digest"); // locked decision
});

test("mergePrefs: partial merges, unknown keys dropped, bad values ignored", () => {
  const m = mergePrefs({ message: false, new_post: "all", bogus: 42, agreement: "yes" });
  assert.equal(m.message, false);
  assert.equal(m.new_post, "all");
  assert.equal(m.agreement, true, "non-boolean ignored → default");
  assert.equal((m as unknown as Record<string, unknown>).bogus, undefined);
  assert.equal(m.digest, true);
});

test("validatePrefsUpdate: valid partials pass, garbage rejected", () => {
  assert.ok(validatePrefsUpdate({ prefs: { message: false } }).update);
  assert.ok(validatePrefsUpdate({ prefs: { new_post: "matches" } }).update);
  assert.ok(validatePrefsUpdate({ quietStart: "22:00", quietEnd: "07:00" }).update);
  assert.ok(validatePrefsUpdate({ quietStart: null, quietEnd: null }).update);

  assert.ok(validatePrefsUpdate({}).error, "empty payload rejected");
  assert.ok(validatePrefsUpdate({ prefs: { new_post: "sometimes" } }).error, "bad mode");
  assert.ok(validatePrefsUpdate({ prefs: { unknown_cat: true } }).error, "unknown key");
  assert.ok(validatePrefsUpdate({ prefs: { message: "yes" } }).error, "non-boolean");
  assert.ok(validatePrefsUpdate({ quietStart: "22:00" }).error, "half-set quiet hours");
  assert.ok(validatePrefsUpdate({ quietStart: "10pm", quietEnd: "07:00" }).error, "bad HH:MM");
});

// ── DB-gated: delivery matrix, targeting, digest ────────────────────────────

async function loadCtx() {
  const { prisma } = await import("../lib/prisma");
  const { notifyUser, notifyMany } = await import("../lib/notifyUser");
  const { signAccessToken } = await import("../lib/auth");
  const { NextRequest } = await import("next/server");
  return { prisma, notifyUser, notifyMany, signAccessToken, NextRequest };
}

type Ctx = Awaited<ReturnType<typeof loadCtx>>;

async function seedUser(ctx: Ctx, tag: string, name: string, depotId: string, opts?: {
  prefs?: object; quietStart?: string; quietEnd?: string; flexibleMode?: boolean; withSub?: boolean;
}) {
  const u = await ctx.prisma.user.create({
    data: {
      email: `${tag}-${name}@test.invalid`, passwordHash: "x", firstName: name, lastName: "T",
      depotId,
      notificationPrefs: opts?.prefs ?? undefined,
      quietStart: opts?.quietStart ?? null,
      quietEnd: opts?.quietEnd ?? null,
      flexibleMode: opts?.flexibleMode ?? false,
    },
    select: { id: true, email: true },
  });
  if (opts?.withSub) {
    await ctx.prisma.pushSubscription.create({
      data: { userId: u.id, endpoint: `https://push.invalid/${tag}-${name}`, p256dh: "x", auth: "x" },
    });
  }
  return u;
}

async function cleanupTag(ctx: Ctx, tag: string, depotId: string) {
  const users = await ctx.prisma.user.findMany({ where: { email: { startsWith: tag } }, select: { id: true } });
  const ids = users.map(u => u.id);
  await ctx.prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await ctx.prisma.pushSubscription.deleteMany({ where: { userId: { in: ids } } });
  await ctx.prisma.swap.deleteMany({ where: { userId: { in: ids } } });
  await ctx.prisma.user.deleteMany({ where: { id: { in: ids } } });
  await ctx.prisma.depot.deleteMany({ where: { id: depotId } });
}

test("delivery matrix: disabled personal → in-app only; disabled broadcast → nothing; quiet hours → in-app only", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const tag = `np-${randomUUID().slice(0, 8)}`;
  const depot = await ctx.prisma.depot.create({ data: { name: tag, code: tag, borough: "Bronx", operator: "NYCT" } });
  try {
    const msgOff = await seedUser(ctx, tag, "msgoff", depot.id, { prefs: { message: false } });
    const digestOff = await seedUser(ctx, tag, "digoff", depot.id, { prefs: { digest: false } });
    const quiet = await seedUser(ctx, tag, "quiet", depot.id, { quietStart: "00:00", quietEnd: "23:59" }); // always quiet

    // Disabled personal category → in-app record still created
    await ctx.notifyUser(msgOff.id, { category: "message", title: "t", body: "b", url: "/x" });
    assert.equal(await ctx.prisma.notification.count({ where: { userId: msgOff.id, type: "message" } }), 1);

    // Disabled broadcast category → neither push nor record
    await ctx.notifyUser(digestOff.id, { category: "digest", title: "t", body: "b", url: "/x" });
    assert.equal(await ctx.prisma.notification.count({ where: { userId: digestOff.id } }), 0);

    // Enabled category during quiet hours → record persists (push suppressed)
    await ctx.notifyUser(quiet.id, { category: "agreement", title: "t", body: "b", url: "/x" });
    assert.equal(await ctx.prisma.notification.count({ where: { userId: quiet.id, type: "agreement" } }), 1);

    // new_post mode digest → notifyMany drops both record and push
    await ctx.notifyMany([msgOff.id], { category: "new_post", title: "t", body: "b", url: "/x" });
    assert.equal(await ctx.prisma.notification.count({ where: { userId: msgOff.id, type: "new_post" } }), 0);
  } finally { await cleanupTag(ctx, tag, depot.id); }
});

test("new_post targeting: exactly the right recipient set", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const tag = `np-${randomUUID().slice(0, 8)}`;
  const depot = await ctx.prisma.depot.create({ data: { name: tag, code: tag, borough: "Bronx", operator: "NYCT" } });
  try {
    const poster = await seedUser(ctx, tag, "poster", depot.id);
    const modeAll = await seedUser(ctx, tag, "all", depot.id, { prefs: { new_post: "all" }, withSub: true });
    const matchOpen = await seedUser(ctx, tag, "matchopen", depot.id, { prefs: { new_post: "matches" }, withSub: true });
    const matchNone = await seedUser(ctx, tag, "matchnone", depot.id, { prefs: { new_post: "matches" }, withSub: true });
    const matchFlex = await seedUser(ctx, tag, "matchflex", depot.id, { prefs: { new_post: "matches" }, flexibleMode: true, withSub: true });
    const modeDigest = await seedUser(ctx, tag, "digest", depot.id, { withSub: true }); // default mode = digest
    const modeOff = await seedUser(ctx, tag, "off", depot.id, { prefs: { new_post: "off" }, withSub: true });

    // matchOpen has an open WORK swap (same category as the new post)
    await ctx.prisma.swap.create({
      data: { userId: matchOpen.id, depotId: depot.id, category: "work", details: `${tag} open work`, posterName: "M O", status: "open" },
    });

    // Poster posts a work swap through the real route handler
    const { POST } = await import("../app/api/swaps/route");
    const req = new ctx.NextRequest("http://localhost/api/swaps", {
      method: "POST",
      headers: {
        authorization: `Bearer ${ctx.signAccessToken({ userId: poster.id, email: poster.email })}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ category: "work", details: `${tag} fresh swap posted now` }),
    });
    const res = await POST(req);
    assert.equal(res.status, 201);

    const rows = await ctx.prisma.notification.findMany({
      where: { type: "new_post", userId: { in: [modeAll.id, matchOpen.id, matchNone.id, matchFlex.id, modeDigest.id, modeOff.id] } },
      select: { userId: true },
    });
    const got = new Set(rows.map(r => r.userId));
    assert.ok(got.has(modeAll.id), "mode all included");
    assert.ok(got.has(matchOpen.id), "matches + open same-category swap included");
    assert.ok(got.has(matchFlex.id), "matches + flexibleMode included");
    assert.ok(!got.has(matchNone.id), "matches without a match excluded");
    assert.ok(!got.has(modeDigest.id), "default digest mode excluded from real-time");
    assert.ok(!got.has(modeOff.id), "off excluded");
  } finally { await cleanupTag(ctx, tag, depot.id); }
});

test("digest cron: excludes digest-off and new_post-off users", { skip: !DB }, async () => {
  const ctx = await loadCtx();
  const tag = `np-${randomUUID().slice(0, 8)}`;
  const depot = await ctx.prisma.depot.create({ data: { name: tag, code: tag, borough: "Bronx", operator: "NYCT" } });
  try {
    const normal = await seedUser(ctx, tag, "normal", depot.id, { withSub: true });
    const digOff = await seedUser(ctx, tag, "digoff", depot.id, { prefs: { digest: false }, withSub: true });
    const npOff = await seedUser(ctx, tag, "npoff", depot.id, { prefs: { new_post: "off" }, withSub: true });
    // A fresh open swap in the last 24h so the depot has a digest to send
    await ctx.prisma.swap.create({
      data: { userId: normal.id, depotId: depot.id, category: "work", details: `${tag} digest swap`, posterName: "N T", status: "open" },
    });

    const { GET } = await import("../app/api/cron/daily-digest/route");
    const res = await GET(new ctx.NextRequest("http://localhost/api/cron/daily-digest", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }));
    assert.equal(res.status, 200);

    assert.equal(await ctx.prisma.notification.count({ where: { userId: normal.id, type: "digest" } }), 1, "normal user gets digest");
    assert.equal(await ctx.prisma.notification.count({ where: { userId: digOff.id, type: "digest" } }), 0, "digest-off excluded");
    assert.equal(await ctx.prisma.notification.count({ where: { userId: npOff.id, type: "digest" } }), 0, "new_post-off excluded");
  } finally { await cleanupTag(ctx, tag, depot.id); }
});
