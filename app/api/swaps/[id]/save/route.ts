import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  if (!await rateLimit(`save:${user.userId}`, 60, 60_000)) {
    return err("Slow down — max 60 saves per minute", 429);
  }

  const { id: swapId } = await params;

  const swap = await prisma.swap.findUnique({ where: { id: swapId } });
  if (!swap) return err("Swap not found", 404);
  if (swap.userId === user.userId) return err("Cannot save your own swap", 400);

  await prisma.savedSwap.upsert({
    where: { userId_swapId: { userId: user.userId, swapId } },
    create: { userId: user.userId, swapId },
    update: {},
  });

  return ok({ saved: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  if (!await rateLimit(`save:${user.userId}`, 60, 60_000)) {
    return err("Slow down — max 60 saves per minute", 429);
  }

  const { id: swapId } = await params;

  await prisma.savedSwap.deleteMany({ where: { userId: user.userId, swapId } });
  return ok({ saved: false });
}
