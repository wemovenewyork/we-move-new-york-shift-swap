import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const swaps = await prisma.swap.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
  });

  return ok(swaps);
}
