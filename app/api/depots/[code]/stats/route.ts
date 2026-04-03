import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try { requireUser(req); } catch { return err("Unauthorized", 401); }
  const depot = await prisma.depot.findUnique({ where: { code: params.code } });
  if (!depot) return err("Not found", 404);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const [completed, active] = await Promise.all([
    prisma.swap.count({ where: { depotId: depot.id, status: "filled", updatedAt: { gte: monthStart } } }),
    prisma.swap.count({ where: { depotId: depot.id, status: { in: ["open", "pending"] } } }),
  ]);
  return ok({ completed, active });
}
