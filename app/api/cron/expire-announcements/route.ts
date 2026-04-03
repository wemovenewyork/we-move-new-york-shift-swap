import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return err("Unauthorized", 401);

  const result = await prisma.announcement.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return ok({ deleted: result.count });
}
