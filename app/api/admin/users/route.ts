import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || !["admin", "subAdmin"].includes(dbUser.role)) return err("Forbidden", 403);

  const isSubAdmin = dbUser.role === "subAdmin";
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";

  const users = await prisma.user.findMany({
    where: q ? {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        ...(!isSubAdmin ? [{ email: { contains: q, mode: "insensitive" as const } }] : []),
      ],
    } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, firstName: true, lastName: true,
      // subAdmin does not see email addresses
      ...(isSubAdmin ? {} : { email: true }),
      role: true, createdAt: true, lastActiveAt: true, suspendedUntil: true,
      depot: { select: { name: true, code: true } },
    },
  });

  return ok(users);
}

export async function PATCH(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || dbUser.role !== "admin") return err("Forbidden", 403);

  const { userId, role, depotId, suspendedUntil } = await req.json();
  if (!userId) return err("userId required", 400);
  if (userId === user.userId) return err("Cannot change your own role", 400);

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!target) return err("User not found", 404);

  // Validate role if provided
  if (role !== undefined && !["operator", "depotRep", "subAdmin", "admin"].includes(role)) {
    return err("Invalid role", 400);
  }
  if (role === "depotRep" && !depotId) return err("Depot is required for depot rep role", 400);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(role !== undefined && { role }),
      ...(depotId !== undefined && {
        depotId,
        depotSetAt: new Date(), // Admin resets the lock timer
      }),
      ...(suspendedUntil !== undefined && { suspendedUntil: new Date(suspendedUntil) }),
    },
    select: { id: true, firstName: true, lastName: true, role: true, depotId: true, suspendedUntil: true, depot: { select: { name: true, code: true } } },
  });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;
  writeAuditLog({
    adminId: user.userId,
    action: "role_change",
    targetId: userId,
    targetType: "user",
    detail: [
      role !== undefined ? `role → ${role}` : null,
      depotId !== undefined ? `depot → ${depotId ?? "none"}` : null,
    ].filter(Boolean).join(", ") + ` for ${target.email}`,
    ip,
  });

  return ok(updated);
}

export async function DELETE(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || dbUser.role !== "admin") return err("Forbidden", 403);

  const { userId } = await req.json();
  if (!userId) return err("userId required", 400);
  if (userId === user.userId) return err("Cannot delete your own account", 400);

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, lastName: true } });
  if (!target) return err("User not found", 404);

  // Anonymize instead of hard delete to preserve swap/agreement history
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted_${userId}@deleted.invalid`,
      passwordHash: "deleted",
      firstName: "Deleted",
      lastName: "User",
      avatarUrl: null,
      depotId: null,
      pushSubscriptions: { deleteMany: {} },
    },
  });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;
  writeAuditLog({
    adminId: user.userId,
    action: "user_delete",
    targetId: userId,
    targetType: "user",
    detail: `Deleted account: ${target.firstName} ${target.lastName} (${target.email})`,
    ip,
  });

  return ok({ deleted: true });
}
