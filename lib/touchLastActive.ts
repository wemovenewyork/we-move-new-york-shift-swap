import { prisma } from "@/lib/prisma";

// Fire-and-forget — never awaited, never throws
export function touchLastActive(userId: string): void {
  prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  }).catch(() => {});
}
