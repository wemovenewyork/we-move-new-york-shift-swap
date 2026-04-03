import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// PATCH /api/notifications/:id  → mark one notification as read
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;

  await prisma.notification.updateMany({
    where: { id, userId: user.userId },
    data: { read: true },
  });

  return ok({});
}

// DELETE /api/notifications/:id  → delete one notification
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;

  await prisma.notification.deleteMany({ where: { id, userId: user.userId } });

  return ok({ deleted: true });
}
