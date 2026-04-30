import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { writeAuditLog } from "@/lib/audit";
import { parseBody, BODY_2KB, BODY_1KB } from "@/lib/parseBody";
import { blockUserAccessTokens } from "@/lib/tokenBlocklist";

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

  const patchBody = await parseBody(req, BODY_2KB);
  if (patchBody instanceof NextResponse) return patchBody;
  const { userId, role, depotId, suspendedUntil, verifiedOperator } = patchBody as {
    userId: string; role?: string; depotId?: string | null; suspendedUntil?: string; verifiedOperator?: boolean;
  };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: {
      ...(role !== undefined && { role }),
      ...(depotId !== undefined && {
        depotId: depotId ?? null,
        depotSetAt: new Date(), // Admin resets the lock timer
      }),
      ...(suspendedUntil !== undefined && { suspendedUntil: new Date(suspendedUntil) }),
      ...(verifiedOperator !== undefined && { verifiedOperator }),
    } as Parameters<typeof prisma.user.update>[0]["data"],
    select: { id: true, firstName: true, lastName: true, role: true, depotId: true, suspendedUntil: true, depot: { select: { name: true, code: true } } },
  });

  // If admin suspended the user (or set suspendedUntil to a future date),
  // invalidate any active access tokens so the user is kicked from the app
  // immediately rather than continuing for up to 15min until token expiry.
  // Also invalidate when role changes — a demoted admin shouldn't keep their
  // privileges for the remainder of their token.
  const wasSuspended = suspendedUntil !== undefined && new Date(suspendedUntil) > new Date();
  const wasRoleChanged = role !== undefined && role !== target.role;
  if (wasSuspended || wasRoleChanged) {
    await blockUserAccessTokens(userId);
  }

  // When a user is suspended, also invalidate their unused invite codes.
  // Otherwise the suspended user's codes (or codes they shared publicly) are
  // still claimable, opening the door to a chain of spam accounts.
  if (wasSuspended) {
    await prisma.inviteCode.updateMany({
      where: { createdBy: userId, usedBy: null, isValid: true },
      data: { isValid: false },
    });
  }

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

  const delBody = await parseBody(req, BODY_1KB);
  if (delBody instanceof NextResponse) return delBody;
  const { userId } = delBody as { userId: string };
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
