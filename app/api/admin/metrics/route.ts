import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { buildMetrics, RANGES, Range } from "@/lib/metrics";

// GET /api/admin/metrics?range=7d|30d|90d — read-only admin dashboard data.
// Same admin guard as reports/broadcast. Per-section degradation lives in
// buildMetrics (a failing section → null + Sentry, never a 500).
export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || !["admin", "subAdmin"].includes(dbUser.role)) return err("Forbidden", 403);

  const raw = new URL(req.url).searchParams.get("range") ?? "30d";
  if (!RANGES.includes(raw as Range)) return err("Invalid range — use 7d, 30d, or 90d", 400);

  const metrics = await buildMetrics(raw as Range);
  return ok(metrics);
}
