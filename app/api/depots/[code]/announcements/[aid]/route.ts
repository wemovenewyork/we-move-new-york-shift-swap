import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// PATCH /api/depots/:code/announcements/:aid → edit pinned/body/expiresAt
// DELETE /api/depots/:code/announcements/:aid → delete
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string; aid: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { aid } = await params;
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return err("User not found", 404);
  if (dbUser.role !== "depotRep" && dbUser.role !== "admin") return err("Forbidden", 403);

  const ann = await prisma.announcement.findUnique({ where: { id: aid } });
  if (!ann) return err("Announcement not found", 404);
  if (dbUser.role === "depotRep" && ann.authorId !== user.userId) return err("You can only edit your own announcements", 403);

  const body = await req.json();
  const { text, pinned, expiresAt } = body;

  const updated = await prisma.announcement.update({
    where: { id: aid },
    data: {
      ...(text !== undefined && { body: text.trim() }),
      ...(pinned !== undefined && { pinned }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  });

  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string; aid: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { aid } = await params;
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return err("User not found", 404);
  if (dbUser.role !== "depotRep" && dbUser.role !== "admin") return err("Forbidden", 403);

  const ann = await prisma.announcement.findUnique({ where: { id: aid } });
  if (!ann) return err("Announcement not found", 404);
  if (dbUser.role === "depotRep" && ann.authorId !== user.userId) return err("You can only delete your own announcements", 403);

  await prisma.announcement.delete({ where: { id: aid } });
  return ok({ deleted: true });
}
