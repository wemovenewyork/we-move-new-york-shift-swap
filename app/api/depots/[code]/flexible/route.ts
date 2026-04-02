import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/reputation";
import { ok, err } from "@/lib/apiResponse";

// GET /api/depots/:code/flexible → list operators in this depot with flexibleMode on
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { code } = await params;
  const depot = await prisma.depot.findUnique({ where: { code } });
  if (!depot) return err("Depot not found", 404);

  const flexibleUsers = await prisma.user.findMany({
    where: {
      depotId: depot.id,
      flexibleMode: true,
      id: { not: user.userId },          // don't show yourself
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      depotId: true,
      flexibleSince: true,
      reputation: true,
    },
    orderBy: { flexibleSince: "asc" },   // longest-standing flexible first
  });

  // Attach rep scores
  const results = await Promise.all(
    flexibleUsers.map(async (u) => {
      const reviews = await prisma.review.findMany({
        where: { reviewedId: u.id },
        select: { rating: true },
      });
      const rep = u.reputation;
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        depotId: u.depotId,
        flexibleSince: u.flexibleSince,
        reputation: calcScore({
          completed: rep?.completed ?? 0,
          cancelled: rep?.cancelled ?? 0,
          noShow: rep?.noShow ?? 0,
          reviews: reviews.map((r) => r.rating),
        }),
      };
    })
  );

  return ok(results);
}
