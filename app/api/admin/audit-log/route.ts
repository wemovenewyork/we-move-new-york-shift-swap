import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || dbUser.role !== "admin") return err("Forbidden", 403);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      admin: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  return ok(logs);
}
