import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;
  if (id === user.userId) return err("Cannot block yourself", 400);
  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), adminId: user.userId, action: "block_user", targetId: id, targetType: "user" },
  });
  return ok({ blocked: true });
}
