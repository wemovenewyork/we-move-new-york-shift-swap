import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { writeAuditLog } from "@/lib/audit";
import { parseBody, BODY_1KB } from "@/lib/parseBody";

// GET /api/admin/dispatchers — list pending (unverified) dispatchers
export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || !["admin", "subAdmin"].includes(dbUser.role)) return err("Forbidden", 403);

  const dispatchers = await prisma.user.findMany({
    where: { role: "dispatcher" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      dispatcherVerified: true,
      dispatcherBadge: true,
      createdAt: true,
      depot: { select: { name: true, code: true } },
    },
  });

  return ok(dispatchers);
}

// PATCH /api/admin/dispatchers — verify or reject a dispatcher
export async function PATCH(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || !["admin", "subAdmin"].includes(dbUser.role)) return err("Forbidden", 403);

  const body = await parseBody(req, BODY_1KB);
  if (body instanceof NextResponse) return body;
  const { userId, verified } = body as { userId: string; verified: boolean };
  if (!userId || typeof verified !== "boolean") return err("userId and verified (boolean) required", 400);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, firstName: true, lastName: true, email: true },
  });
  if (!target) return err("User not found", 404);
  if (target.role !== "dispatcher") return err("User is not a dispatcher", 400);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { dispatcherVerified: verified },
    select: { id: true, firstName: true, lastName: true, email: true, dispatcherVerified: true },
  });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;
  writeAuditLog({
    adminId: user.userId,
    action: "role_change",
    targetId: userId,
    targetType: "user",
    detail: `dispatcher_verified → ${verified} for ${target.email}`,
    ip,
  });

  return ok(updated);
}
