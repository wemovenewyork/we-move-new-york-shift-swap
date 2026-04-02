import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { notifyMany } from "@/lib/notifyUser";

const VALID = ["open", "pending", "filled", "expired"] as const;
type Status = (typeof VALID)[number];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;
  const { status } = await req.json();

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

    // Notify all other users who messaged about this swap
    const interestedUsers = await prisma.message.findMany({
      where: { swapId: id, fromUserId: { not: swap.userId } },
      select: { fromUserId: true },
      distinct: ["fromUserId"],
    });
    const ids = interestedUsers.map(m => m.fromUserId);
    if (ids.length > 0) {
      notifyMany(ids, {
        title: "Swap has been filled",
        body: `A swap you were interested in has been filled — check the board for new ones`,
        url: `/depot/${swap.depotId}/swaps`,
      });
    }
  }

  const updated = await prisma.swap.update({ where: { id }, data: { status } });
  return ok(updated);
}
