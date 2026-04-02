import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { randomBytes } from "crypto";

function genCode(): string {
  return "WMNY-" + randomBytes(3).toString("hex").toUpperCase();
}

// GET /api/admin/invites — list all invite codes
export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || dbUser.role !== "admin") return err("Forbidden", 403);

  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return ok(codes);
}

// POST /api/admin/invites — create N new invite codes
export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || dbUser.role !== "admin") return err("Forbidden", 403);

  const { count = 1 } = await req.json();
  if (typeof count !== "number" || count < 1 || count > 50) return err("Count must be 1–50", 400);

  const created = await Promise.all(
    Array.from({ length: count }, () =>
      prisma.inviteCode.create({ data: { code: genCode(), createdBy: user.userId } })
    )
  );

  return ok(created);
}

// DELETE /api/admin/invites — revoke an unused invite code
export async function DELETE(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || dbUser.role !== "admin") return err("Forbidden", 403);

  const { id } = await req.json();
  if (!id) return err("Code id required", 400);

  const code = await prisma.inviteCode.findUnique({ where: { id } });
  if (!code) return err("Not found", 404);
  if (code.usedBy) return err("Cannot revoke a used code", 400);

  await prisma.inviteCode.delete({ where: { id } });
  return ok({ message: "Revoked" });
}
