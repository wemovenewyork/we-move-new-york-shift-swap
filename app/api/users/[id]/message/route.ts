import { NextRequest, NextResponse } from "next/server";
import { requireUser, checkActive } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { parseBody, BODY_2KB } from "@/lib/parseBody";
import { ok, err } from "@/lib/apiResponse";
import { notifyUser } from "@/lib/notifyUser";

// POST /api/users/:id/message → send a direct message to any operator (not tied to a swap)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const ip = clientIp(req);
  if (!await rateLimit(`dm:ip:${ip}`, 60, 3_600_000)) return err("Rate limit exceeded — too many messages from this network", 429);
  if (!await rateLimit(`dm:${user.userId}`, 10, 3_600_000)) return err("Rate limit: max 10 direct messages per hour", 429);

  const { id: toUserId } = await params;
  const dbSender = await prisma.user.findUnique({ where: { id: user.userId }, select: { email: true, suspendedUntil: true } });
  if (!dbSender) return err("User not found", 404);
  const activeErr = checkActive(dbSender);
  if (activeErr) return err(activeErr, 403);
  if (toUserId === user.userId) return err("Cannot message yourself", 400);

  const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!toUser) return err("User not found", 404);

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user.userId, blockedId: toUserId },
        { blockerId: toUserId, blockedId: user.userId },
      ],
    },
    select: { id: true },
  });
  if (block) return err("Unable to send message", 403);

  const body = await parseBody(req, BODY_2KB);
  if (body instanceof NextResponse) return body;
  const { text } = body as { text: string };
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
