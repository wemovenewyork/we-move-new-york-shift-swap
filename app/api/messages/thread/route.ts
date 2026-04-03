import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const url = new URL(req.url);
  const withUserId = url.searchParams.get("with");
  if (!withUserId) return err("'with' query param required", 400);

  const [messages] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: user.userId, toUserId: withUserId },
          { fromUserId: withUserId, toUserId: user.userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        swap: { select: { id: true, details: true, category: true } },
      },
    }),
    // Mark received messages as read
    prisma.message.updateMany({
      where: { fromUserId: withUserId, toUserId: user.userId, read: false },
      data: { read: true },
    }),
  ]);

  return ok(messages);
}

// DELETE /api/messages/thread?with=userId  → delete all messages in a thread
export async function DELETE(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const url = new URL(req.url);
  const withUserId = url.searchParams.get("with");
  if (!withUserId) return err("'with' query param required", 400);

  const result = await prisma.message.deleteMany({
    where: {
      OR: [
        { fromUserId: user.userId, toUserId: withUserId },
        { fromUserId: withUserId, toUserId: user.userId },
      ],
    },
  });

  return ok({ deleted: result.count });
}
