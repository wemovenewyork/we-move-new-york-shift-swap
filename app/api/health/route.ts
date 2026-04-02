import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "ok", db: "ok", ts: new Date().toISOString() });
  } catch {
    return err("Database unreachable", 503);
  }
}
