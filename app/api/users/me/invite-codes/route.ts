import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const codes = await prisma.inviteCode.findMany({
    where: { createdBy: user.userId },
    select: { code: true, isValid: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return ok(codes);
}
