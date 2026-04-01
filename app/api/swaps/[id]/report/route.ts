import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;
  const { reason } = await req.json();

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) return err("Swap not found", 404);

  const existing = await prisma.report.findFirst({
    where: { swapId: id, reporterId: user.userId },
  });
  if (existing) return err("Already reported", 409);

  await prisma.report.create({
    data: { swapId: id, reporterId: user.userId, reason: reason ?? null },
  });

  return ok({ message: "Reported. Thank you." }, 201);
}
