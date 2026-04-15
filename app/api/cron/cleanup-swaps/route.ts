import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// POST /api/cron/cleanup-swaps
// Deletes expired or filled swaps that have been in that state for 7+ days.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return err("Unauthorized", 401);

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const result = await prisma.swap.deleteMany({
      where: {
        status: { in: ["expired", "filled"] },
        updatedAt: { lt: cutoff },
      },
    });

    return ok({ deleted: result.count });
  } catch (e) {
    return err(`Cron failed: ${e instanceof Error ? e.message : "unknown error"}`, 500);
  }
}
