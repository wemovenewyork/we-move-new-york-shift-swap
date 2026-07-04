import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  assertRowsUpdated,
  isFinalizedConflict,
  AGREEMENT_FINALIZED,
} from "../lib/agreementGuard";

// ── Pure conflict-path logic (runs anywhere) ────────────────────────────────

test("assertRowsUpdated throws a tagged conflict when zero rows matched", () => {
  try {
    assertRowsUpdated(0);
    assert.fail("expected assertRowsUpdated(0) to throw");
  } catch (e) {
    assert.equal((e as { code?: string }).code, AGREEMENT_FINALIZED);
    assert.ok(isFinalizedConflict(e));
  }
});

test("assertRowsUpdated is a no-op when at least one row matched", () => {
  assert.doesNotThrow(() => assertRowsUpdated(1));
  assert.doesNotThrow(() => assertRowsUpdated(2));
});

test("isFinalizedConflict only matches the tagged error", () => {
  assert.equal(isFinalizedConflict(new Error("boom")), false);
  assert.equal(isFinalizedConflict(null), false);
  assert.equal(isFinalizedConflict({ code: "P2002" }), false);
  assert.equal(isFinalizedConflict({ code: AGREEMENT_FINALIZED }), true);
});

// ── Real race against Postgres (runs only with a scratch DATABASE_URL) ───────
// Seeds an agreement, then fires the confirm and cancel guarded writes
// concurrently. Postgres row-locks serialize them, so the loser's status-scoped
// WHERE matches zero rows — exactly one write wins.
test(
  "racing confirm + cancel: exactly one guarded write wins",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const { prisma } = await import("../lib/prisma");

    const depot = await prisma.depot.create({
      data: { name: "Test Depot", code: `T-${randomUUID().slice(0, 8)}`, borough: "Brooklyn", operator: "NYCT" },
    });
    const mkUser = (n: string) =>
      prisma.user.create({
        data: { email: `${randomUUID()}@test.invalid`, passwordHash: "x", firstName: n, lastName: "T", depotId: depot.id },
      });
    const userA = await mkUser("A");
    const userB = await mkUser("B");
    const swap = await prisma.swap.create({
      data: { userId: userB.id, depotId: depot.id, category: "work", details: "race test", posterName: "B T", status: "pending" },
    });
    const agreement = await prisma.swapAgreement.create({
      data: { swapId: swap.id, userAId: userA.id, userBId: userB.id, status: "pending" },
    });

    try {
      const [confirm, cancel] = await Promise.all([
        prisma.swapAgreement.updateMany({
          where: { id: agreement.id, status: { in: ["pending"] } },
          data: { status: "completed" },
        }),
        prisma.swapAgreement.updateMany({
          where: { id: agreement.id, status: { in: ["pending", "userA_confirmed"] } },
          data: { status: "cancelled" },
        }),
      ]);

      // Exactly one write matched a row; the other lost the race (count 0 → 409).
      assert.equal(confirm.count + cancel.count, 1);
      const finalRow = await prisma.swapAgreement.findUniqueOrThrow({ where: { id: agreement.id } });
      assert.ok(["completed", "cancelled"].includes(finalRow.status));
    } finally {
      await prisma.swapAgreement.deleteMany({ where: { id: agreement.id } });
      await prisma.swap.deleteMany({ where: { id: swap.id } });
      await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
      await prisma.depot.deleteMany({ where: { id: depot.id } });
      await prisma.$disconnect();
    }
  },
);
