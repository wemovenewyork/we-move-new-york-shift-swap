import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser } from "@/lib/notifyUser";

// POST /api/users/:id/message → send a direct message to any operator (not tied to a swap)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  if (!await rateLimit(`dm:${user.userId}`, 10, 3_600_000)) return err("Rate limit: max 10 direct messages per hour", 429);

  const { id: toUserId } = await params;
  if (toUserId === user.userId) return err("Cannot message yourself", 400);

  const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!toUser) return err("User not found", 404);

  const body = await req.json();
  const { text } = body;
  if (!text?.trim()) return err("Message text is required", 400);
  if (text.length > 500) return err("Message must be 500 characters or fewer", 400);

  const [message, sender, depot] = await Promise.all([
    prisma.message.create({
      data: { fromUserId: user.userId, toUserId, text: text.trim(), swapId: null },
      include: { fromUser: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.user.findUnique({ where: { id: user.userId }, select: { firstName: true, lastName: true } }),
    toUser.depotId ? prisma.depot.findUnique({ where: { id: toUser.depotId }, select: { code: true } }) : null,
  ]);

  const threadUrl = depot?.code
    ? `/depot/${depot.code}/messages/${user.userId}`
    : `/inbox`;

  await notifyUser(toUserId, {
    title: `Message from ${sender?.firstName ?? "an operator"}`,
    body: text.trim().substring(0, 80),
    url: threadUrl,
  });

  return ok(message, 201);
}
