import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// Returns all swaps by the current user (any status), sorted newest first.
// Also includes agreements the user participated in.
export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const swaps = await prisma.swap.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    include: {
      agreements: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        include: {
          userA: { select: { id: true, firstName: true, lastName: true } },
          userB: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return ok(swaps);
}
