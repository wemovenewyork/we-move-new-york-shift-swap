import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return err("Unauthorized", 401);

  const result = await prisma.announcement.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return ok({ deleted: result.count });
}
