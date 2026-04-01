import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// POST /api/swaps/:id/agreement  → propose a formal agreement (must have sent interest first)
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

  // Check for existing pending agreement
  const existing = await prisma.swapAgreement.findFirst({
    where: { swapId: id, status: { in: ["pending", "userA_confirmed"] } },
  });
  if (existing) return err("An agreement is already in progress for this swap", 409);

  const agreement = await prisma.swapAgreement.create({
    data: {
      swapId: id,
      userAId: user.userId,         // initiator (the interested party)
      userBId: swap.userId,          // swap owner
      status: "pending",
      userANote: note ?? null,
      userAAt: new Date(),
    },
    include: {
      userA: { select: { id: true, firstName: true, lastName: true } },
      userB: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Update swap status to pending
  await prisma.swap.update({ where: { id }, data: { status: "pending" } });

  return ok(agreement, 201);
}

// GET /api/swaps/:id/agreement → get current agreement for this swap
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

// PATCH /api/swaps/:id/agreement → owner confirms (userB) or either cancels
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { id } = await params;
  const body = await req.json();
  const { action, note } = body; // action: "confirm" | "cancel"

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

  if (action === "cancel") {
    const updated = await prisma.swapAgreement.update({
      where: { id: agreement.id },
      data: { status: "cancelled" },
    });
    // Re-open the swap
    await prisma.swap.update({ where: { id }, data: { status: "open" } });
    return ok(updated);
  }

  if (action === "confirm") {
    if (!isUserB && !isUserA) return err("Not a participant in this agreement", 403);

    if (isUserB && agreement.status === "pending") {
      // Swap owner confirms → move to userA_confirmed (both have confirmed)
      const updated = await prisma.swapAgreement.update({
        where: { id: agreement.id },
        data: {
          status: "userA_confirmed",
          userBNote: note ?? null,
          userBAt: new Date(),
        },
      });
      return ok(updated);
    }

    if (isUserA && agreement.status === "userA_confirmed") {
      // Initiator does final confirm → completed
      const updated = await prisma.swapAgreement.update({
        where: { id: agreement.id },
        data: { status: "completed", completedAt: new Date() },
      });
      await prisma.swap.update({ where: { id }, data: { status: "filled" } });
      return ok(updated);
    }

    return err("Invalid confirmation state", 400);
  }

  return err("Invalid action", 400);
}
