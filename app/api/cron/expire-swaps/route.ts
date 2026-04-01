import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// Called by a cron job (e.g. Vercel Cron, external scheduler)
// Secure with CRON_SECRET env var
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return err("Unauthorized", 401);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.swap.updateMany({
    where: { status: "open", date: { lt: today } },
    data: { status: "expired" },
  });

  return ok({ expired: result.count });
}
