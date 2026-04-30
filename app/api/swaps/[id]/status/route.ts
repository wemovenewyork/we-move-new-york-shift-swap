import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { notifyMany } from "@/lib/notifyUser";
import { parseBody, BODY_1KB } from "@/lib/parseBody";

const VALID = ["open", "pending", "filled", "expired"] as const;
type Status = (typeof VALID)[number];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;
  const body = await parseBody(req, BODY_1KB);
  if (body instanceof NextResponse) return body;
  const { status } = body as { status: string };

  if (!VALID.includes(status as Status)) return err("Invalid status", 400);

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) return err("Swap not found", 404);
  if (swap.userId !== user.userId) return err("Not authorized", 403);

  if (status === "filled") {
    await prisma.reputation.upsert({
      where: { userId: user.userId },
      update: { completed: { increment: 1 } },
      create: { userId: user.userId, completed: 1 },
    });

    // Notify everyone with a stake in this swap: anyone who messaged about it,
    // anyone who saved it, and anyone who proposed an agreement on it.
    // Dedupe across sources, exclude the swap owner.
    const [messagers, savers, agreementParticipants] = await Promise.all([
      prisma.message.findMany({
        where: { swapId: id, fromUserId: { not: swap.userId } },
        select: { fromUserId: true },
        distinct: ["fromUserId"],
      }),
      prisma.savedSwap.findMany({
        where: { swapId: id, userId: { not: swap.userId } },
        select: { userId: true },
      }),
      prisma.swapAgreement.findMany({
        where: { swapId: id, userAId: { not: swap.userId } },
        select: { userAId: true },
        distinct: ["userAId"],
      }),
    ]);
    const ids = [...new Set([
      ...messagers.map(m => m.fromUserId),
      ...savers.map(s => s.userId),
      ...agreementParticipants.map(a => a.userAId),
    ])];
    if (ids.length > 0) {
      await notifyMany(ids, {
        title: "Swap has been filled",
        body: `A swap you were interested in has been filled — check the board for new ones`,
        url: `/depot/${swap.depotId}/swaps`,
      });
    }
  }

  const updated = await prisma.swap.update({ where: { id }, data: { status: status as Status } });
  return ok(updated);
}
