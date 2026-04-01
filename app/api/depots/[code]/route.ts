import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const depot = await prisma.depot.findUnique({ where: { code: code.toUpperCase() } });
  if (!depot) return err("Depot not found", 404);
  return ok(depot);
}
