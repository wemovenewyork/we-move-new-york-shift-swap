import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const unreadCount = await prisma.message.count({
    where: { toUserId: user.userId, read: false },
  });

  return ok({ unreadCount });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  if (!rateLimit(`msg:${user.userId}`, 5, 60_000)) {
    return err("Slow down! Max 5 messages per minute", 429);
  }

  const { swapId, text } = await req.json();
  if (!swapId || !text?.trim()) return err("swapId and text required", 400);

  const swap = await prisma.swap.findUnique({ where: { id: swapId } });
  if (!swap) return err("Swap not found", 404);
  if (swap.userId === user.userId) return err("Cannot message yourself", 400);

  const message = await prisma.message.create({
    data: { swapId, fromUserId: user.userId, toUserId: swap.userId, text: text.trim() },
  });

  return ok(message, 201);
}
