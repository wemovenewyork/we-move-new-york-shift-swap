import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(_req: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return err("Database unreachable", 503);
  }

  return ok({ status: "ok" });
}
