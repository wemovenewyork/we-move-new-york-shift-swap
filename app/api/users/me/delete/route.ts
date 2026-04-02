import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { writeAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

// POST /api/users/me/delete
// Requires password confirmation before deleting own account (GDPR right to erasure)
export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { password } = await req.json();
  if (!password) return err("Password required to confirm deletion", 400);

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return err("User not found", 404);

  const valid = await bcrypt.compare(password, dbUser.passwordHash);
  if (!valid) return err("Incorrect password", 401);

  // Anonymize — preserves swap/agreement history integrity
  await prisma.user.update({
    where: { id: user.userId },
    data: {
      email: `deleted_${user.userId}@deleted.invalid`,
      passwordHash: "deleted",
      firstName: "Deleted",
      lastName: "User",
      avatarUrl: null,
      depotId: null,
      pushSubscriptions: { deleteMany: {} },
      inviteCodes: { updateMany: { where: {}, data: { isValid: false } } },
    },
  });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;
  writeAuditLog({
    adminId: user.userId,
    action: "account_delete",
    targetId: user.userId,
    targetType: "user",
    detail: `Self-deleted account: ${dbUser.email}`,
    ip,
  });

  return ok({ deleted: true });
}
