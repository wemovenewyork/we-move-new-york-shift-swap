import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser } from "@/lib/notifyUser";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;

  if (!rateLimit(`msg:${user.userId}`, 5, 60_000)) {
    return err("Slow down! Max 5 messages per minute", 429);
  }

  const { text } = await req.json();
  if (!text?.trim()) return err("Message text required", 400);

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) return err("Swap not found", 404);
  if (swap.userId === user.userId) return err("Cannot message yourself", 400);
  if (swap.status !== "open") return err("Swap is not open", 400);

  const [message, sender] = await Promise.all([
    prisma.message.create({
      data: { swapId: id, fromUserId: user.userId, toUserId: swap.userId, text: text.trim() },
    }),
    prisma.user.findUnique({ where: { id: user.userId }, select: { firstName: true, lastName: true } }),
  ]);

  // Notify swap owner — fire and forget
  notifyUser(swap.userId, {
    title: "New interest in your swap",
    body: `${sender?.firstName ?? "Someone"} is interested — "${text.trim().substring(0, 60)}"`,
    url: `/depot/${swap.depotId}/swaps/${id}`,
  });

  return ok(message, 201);
}
