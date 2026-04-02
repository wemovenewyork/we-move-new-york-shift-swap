import { prisma } from "@/lib/prisma";

export async function writeAuditLog({
  adminId,
  action,
  targetId,
  targetType,
  detail,
  ip,
}: {
  adminId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  detail?: string;
  ip?: string;
}) {
  await prisma.auditLog.create({
    data: { adminId, action, targetId, targetType, detail, ip },
  }).catch(() => {}); // non-fatal
}
