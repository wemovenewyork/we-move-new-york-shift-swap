import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// POST /api/cron/cleanup-swaps
// Deletes expired or filled swaps that have been in that state for 7+ days.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return err("Unauthorized", 401);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const result = await prisma.swap.deleteMany({
    where: {
      status: { in: ["expired", "filled"] },
      updatedAt: { lt: cutoff },
    },
  });

  return ok({ deleted: result.count });
}
