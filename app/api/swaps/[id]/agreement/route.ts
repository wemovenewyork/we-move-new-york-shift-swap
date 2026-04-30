import { NextRequest, NextResponse } from "next/server";
import { requireUser, checkActive } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser, notifyMany } from "@/lib/notifyUser";
import { parseBody, BODY_4KB } from "@/lib/parseBody";

// POST /api/swaps/:id/agreement  → propose a formal agreement
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { id } = await params;

  // Per-user per-swap: max 3 agreement attempts per hour
  if (!await rateLimit(`agreement:${user.userId}:${id}`, 3, 3_600_000)) {
    return err("Too many agreement attempts on this swap — try again later", 429);
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { email: true, suspendedUntil: true } });
  if (!dbUser) return err("User not found", 404);
  const activeErr = checkActive(dbUser);
  if (activeErr) return err(activeErr, 403);

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) return err("Swap not found", 404);
  if (swap.status !== "open") return err("This swap is no longer open", 400);
  if (swap.userId === user.userId) return err("Cannot create agreement on your own swap", 400);

  const body = await parseBody(req, BODY_4KB);
  if (body instanceof NextResponse) return body;
  const { note } = body as { note?: string };

  const existing = await prisma.swapAgreement.findFirst({
    where: { swapId: id, status: { in: ["pending", "userA_confirmed"] } },
  });
  if (existing) return err("An agreement is already in progress for this swap", 409);

  let agreement, proposer;
  try {
    [agreement, proposer] = await Promise.all([
      prisma.swapAgreement.create({
        data: {
          swapId: id,
          userAId: user.userId,
          userBId: swap.userId,
          status: "pending",
          userANote: note ?? null,
          userAAt: new Date(),
        },
        include: {
          userA: { select: { id: true, firstName: true, lastName: true } },
          userB: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.user.findUnique({ where: { id: user.userId }, select: { firstName: true, lastName: true } }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return err("An agreement is already in progress for this swap", 409);
    }
    throw e;
  }

  await prisma.swap.update({ where: { id }, data: { status: "pending" } });

  // Notify the swap poster that someone wants to agree
  const depotCode = await prisma.depot.findUnique({ where: { id: swap.depotId }, select: { code: true } });
  await notifyUser(swap.userId, {
    title: "Someone wants to swap with you!",
    body: `${proposer?.firstName ?? "An operator"} proposed an agreement on your swap`,
    url: `/depot/${depotCode?.code ?? swap.depotId}/swaps/${id}`,
  });

  return ok(agreement, 201);
}

// GET /api/swaps/:id/agreement
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { id } = await params;
  const agreement = await prisma.swapAgreement.findFirst({
    where: {
      swapId: id,
      OR: [{ userAId: user.userId }, { userBId: user.userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      userA: { select: { id: true, firstName: true, lastName: true } },
      userB: { select: { id: true, firstName: true, lastName: true } },
      swap: { select: { id: true, details: true, category: true, posterName: true } },
    },
  });

  if (!agreement) return err("No agreement found", 404);
  return ok(agreement);
}

// PATCH /api/swaps/:id/agreement → confirm or cancel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { id } = await params;
  const body = await parseBody(req, BODY_4KB);
  if (body instanceof NextResponse) return body;
  const { action, note } = body as { action: string; note?: string };

  const agreement = await prisma.swapAgreement.findFirst({
    where: {
      swapId: id,
      OR: [{ userAId: user.userId }, { userBId: user.userId }],
      status: { in: ["pending", "userA_confirmed"] },
    },
  });
  if (!agreement) return err("No active agreement found", 404);

  const isUserB = agreement.userBId === user.userId;
  const isUserA = agreement.userAId === user.userId;

  const swap = await prisma.swap.findUnique({ where: { id }, select: { depotId: true } });
  const depot = swap?.depotId
    ? await prisma.depot.findUnique({ where: { id: swap.depotId }, select: { code: true } })
    : null;
  const depotId = depot?.code ?? swap?.depotId ?? "";

  if (action === "cancel") {
    const updated = await prisma.swapAgreement.update({
      where: { id: agreement.id },
      data: { status: "cancelled" },
    });
    await prisma.swap.update({ where: { id }, data: { status: "open" } });

    // Reputation: ding the user who clicked cancel — they're the one backing out
    // of a commitment (whether they were the proposer or the swap owner).
    await prisma.reputation.upsert({
      where: { userId: user.userId },
      update: { cancelled: { increment: 1 } },
      create: { userId: user.userId, cancelled: 1 },
    });

    // Notify the other party
    const otherUserId = isUserB ? agreement.userAId : agreement.userBId;
    await notifyUser(otherUserId, {
      title: "Agreement cancelled",
      body: "The swap agreement was cancelled",
      url: `/depot/${depotId}/swaps/${id}`,
    });

    return ok(updated);
  }

  if (action === "confirm") {
    if (!isUserB && !isUserA) return err("Not a participant in this agreement", 403);

    // Helper: when a swap is filled, notify everyone who had a stake in it
    // (messagers, savers, agreement proposers — minus the swap owner and minus
    // the user who just confirmed).
    const notifyInterestedOperators = async (excludeUserIds: string[]) => {
      const swapId = id;
      const ownerIdResolved = agreement.userBId;
      const [messagers, savers, agreementParticipants] = await Promise.all([
        prisma.message.findMany({
          where: { swapId, fromUserId: { not: ownerIdResolved } },
          select: { fromUserId: true },
          distinct: ["fromUserId"],
        }),
        prisma.savedSwap.findMany({
          where: { swapId, userId: { not: ownerIdResolved } },
          select: { userId: true },
        }),
        prisma.swapAgreement.findMany({
          where: { swapId, userAId: { not: ownerIdResolved } },
          select: { userAId: true },
          distinct: ["userAId"],
        }),
      ]);
      const exclude = new Set([ownerIdResolved, ...excludeUserIds]);
      const ids = [...new Set([
        ...messagers.map(m => m.fromUserId),
        ...savers.map(s => s.userId),
        ...agreementParticipants.map(a => a.userAId),
      ])].filter(uid => !exclude.has(uid));
      if (ids.length > 0) {
        await notifyMany(ids, {
          title: "Swap has been filled",
          body: "A swap you were interested in has been filled — check the board for new ones",
          url: `/depot/${depotId}/swaps`,
        });
      }
    };

    // Bump reputation for both parties when the swap actually closes.
    // Both operators completed a swap together; both should get credit.
    const bumpReputationForBothParties = async () => {
      await Promise.all([
        prisma.reputation.upsert({
          where: { userId: agreement.userAId },
          update: { completed: { increment: 1 } },
          create: { userId: agreement.userAId, completed: 1 },
        }),
        prisma.reputation.upsert({
          where: { userId: agreement.userBId },
          update: { completed: { increment: 1 } },
          create: { userId: agreement.userBId, completed: 1 },
        }),
      ]);
    };

    // Owner (userB) confirms → agreement is complete
    if (isUserB && agreement.status === "pending") {
      const updated = await prisma.swapAgreement.update({
        where: { id: agreement.id },
        data: { status: "completed", userBNote: note ?? null, userBAt: new Date(), completedAt: new Date() },
      });
      await prisma.swap.update({ where: { id }, data: { status: "filled" } });
      await bumpReputationForBothParties();
      await notifyUser(agreement.userAId, {
        title: "Swap confirmed! 🎉",
        body: "Your swap is locked in. Print the agreement to show your dispatcher.",
        url: `/depot/${depotId}/swaps/${id}`,
      });
      // Also tell other interested operators the swap is gone
      await notifyInterestedOperators([agreement.userAId]);
      return ok(updated);
    }

    // Backwards-compat: handle existing userA_confirmed rows
    if (isUserA && agreement.status === "userA_confirmed") {
      const updated = await prisma.swapAgreement.update({
        where: { id: agreement.id },
        data: { status: "completed", completedAt: new Date() },
      });
      await prisma.swap.update({ where: { id }, data: { status: "filled" } });
      await bumpReputationForBothParties();
      await notifyUser(agreement.userBId, {
        title: "Swap agreement completed!",
        body: "Both operators confirmed. Your swap is locked in.",
        url: `/depot/${depotId}/swaps/${id}`,
      });
      await notifyInterestedOperators([agreement.userBId]);
      return ok(updated);
    }

    return err("Invalid confirmation state", 400);
  }

  return err("Invalid action", 400);
}
