import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// GET  /api/depots/:code/announcements  → active announcements for this depot
// POST /api/depots/:code/announcements  → create (depotRep/admin only)
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { code } = await params;
  const depot = await prisma.depot.findUnique({ where: { code } });
  if (!depot) return err("Depot not found", 404);

  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      depotId: depot.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  });

  return ok(announcements);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return err("User not found", 404);
  if (dbUser.role !== "depotRep" && dbUser.role !== "admin") return err("Only depot reps can post announcements", 403);

  const { code } = await params;
  const depot = await prisma.depot.findUnique({ where: { code } });
  if (!depot) return err("Depot not found", 404);

  if (dbUser.role === "depotRep" && dbUser.depotId !== depot.id) {
    return err("You can only post announcements for your own depot", 403);
  }

  const body = await req.json();
  const { text, pinned, expiresAt } = body;

  if (!text?.trim()) return err("Announcement text is required", 400);
  if (text.length > 600) return err("Announcement must be 600 characters or fewer", 400);

  const announcement = await prisma.announcement.create({
    data: {
      depotId: depot.id,
      authorId: user.userId,
      body: text.trim(),
      pinned: pinned === true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  });

  return ok(announcement, 201);
}
