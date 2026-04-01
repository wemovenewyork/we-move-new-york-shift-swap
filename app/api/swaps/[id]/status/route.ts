import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

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
  }

  const updated = await prisma.swap.update({ where: { id }, data: { status } });
  return ok(updated);
}
