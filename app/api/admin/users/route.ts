import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || dbUser.role !== "admin") return err("Forbidden", 403);

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";

  const users = await prisma.user.findMany({
    where: q ? {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, firstName: true, lastName: true,
      email: true, role: true, createdAt: true,
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

  const { userId, role } = await req.json();
  if (!userId || !["operator", "depotRep", "admin"].includes(role)) return err("Invalid request", 400);
  if (userId === user.userId) return err("Cannot change your own role", 400);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  return ok(updated);
}
