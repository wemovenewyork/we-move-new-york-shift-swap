import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser } from "@/lib/notifyUser";

// POST /api/swaps/:id/agreement  → propose a formal agreement
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { id } = await params;
  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) return err("Swap not found", 404);
  if (swap.status !== "open") return err("This swap is no longer open", 400);
  if (swap.userId === user.userId) return err("Cannot create agreement on your own swap", 400);

  const body = await req.json();
  const { note } = body;

  const existing = await prisma.swapAgreement.findFirst({
    where: { swapId: id, status: { in: ["pending", "userA_confirmed"] } },
  });
  if (existing) return err("An agreement is already in progress for this swap", 409);

  const [agreement, proposer] = await Promise.all([
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

  await prisma.swap.update({ where: { id }, data: { status: "pending" } });

  // Notify swap owner that an agreement has been proposed
  notifyUser(swap.userId, {
    title: "Swap agreement proposed",
    body: `${proposer?.firstName ?? "Someone"} wants to make it official — confirm to lock in the swap`,
    url: `/depot/${swap.depotId}/swaps/${id}`,
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
  const body = await req.json();
  const { action, note } = body;

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
  const depotId = swap?.depotId ?? "";

  if (action === "cancel") {
    const updated = await prisma.swapAgreement.update({
      where: { id: agreement.id },
      data: { status: "cancelled" },
    });
    await prisma.swap.update({ where: { id }, data: { status: "open" } });

    // Notify the other party
    const otherUserId = isUserB ? agreement.userAId : agreement.userBId;
    notifyUser(otherUserId, {
      title: "Agreement cancelled",
      body: "The swap agreement was cancelled",
      url: `/depot/${depotId}/swaps/${id}`,
    });

    return ok(updated);
  }

  if (action === "confirm") {
    if (!isUserB && !isUserA) return err("Not a participant in this agreement", 403);

    if (isUserB && agreement.status === "pending") {
      const updated = await prisma.swapAgreement.update({
        where: { id: agreement.id },
        data: { status: "userA_confirmed", userBNote: note ?? null, userBAt: new Date() },
      });
      // Notify initiator that owner confirmed — their turn to finalize
      notifyUser(agreement.userAId, {
        title: "Owner confirmed — your turn!",
        body: "The swap owner confirmed the agreement. Give your final confirmation to lock it in.",
        url: `/depot/${depotId}/swaps/${id}`,
      });
      return ok(updated);
    }

    if (isUserA && agreement.status === "userA_confirmed") {
      const updated = await prisma.swapAgreement.update({
        where: { id: agreement.id },
        data: { status: "completed", completedAt: new Date() },
      });
      await prisma.swap.update({ where: { id }, data: { status: "filled" } });
      // Notify swap owner that the agreement is fully complete
      notifyUser(agreement.userBId, {
        title: "Swap agreement completed! 🎉",
        body: "Both operators confirmed. Your swap is locked in.",
        url: `/depot/${depotId}/swaps/${id}`,
      });
      return ok(updated);
    }

    return err("Invalid confirmation state", 400);
  }

  return err("Invalid action", 400);
}
