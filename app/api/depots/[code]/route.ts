import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try { requireUser(req); } catch { return err("Unauthorized", 401); }
  try {
    const { code } = await params;
    const depot = await prisma.depot.findUnique({ where: { code: code.toUpperCase() } });
    if (!depot) return err("Depot not found", 404);
    return ok(depot);
  } catch {
    return err("Unable to load depot — please try again", 503);
  }
}
