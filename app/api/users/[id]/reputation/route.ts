import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/reputation";
import { ok, err } from "@/lib/apiResponse";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { requireUser(req); } catch { return err("Unauthorized", 401); }
  const { id } = await params;

  const rep = await prisma.reputation.findUnique({ where: { userId: id } });
  const reviews = await prisma.review.findMany({
    where: { reviewedId: id },
    select: { rating: true },
  });

  const score = calcScore({
    completed: rep?.completed ?? 0,
    cancelled: rep?.cancelled ?? 0,
    noShow: rep?.noShow ?? 0,
    reviews: reviews.map((r) => r.rating),
  });

  return ok(score);
}
