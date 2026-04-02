import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || dbUser.role !== "admin") return err("Forbidden", 403);

  const reports = await prisma.report.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    include: {
      swap: {
        select: {
          id: true, details: true, category: true, posterName: true,
          depot: { select: { name: true, code: true } },
        },
      },
      reporter: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return ok(reports);
}

export async function PATCH(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser || dbUser.role !== "admin") return err("Forbidden", 403);

  const { reportId, action } = await req.json();
  if (!reportId || !["dismiss", "remove"].includes(action)) return err("Invalid request", 400);

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) return err("Report not found", 404);

  if (action === "remove") {
    // Delete the reported swap (cascades to messages, agreements, reviews, reports)
    await prisma.swap.delete({ where: { id: report.swapId } });
  } else {
    await prisma.report.update({ where: { id: reportId }, data: { status: "dismissed" } });
  }

  return ok({ ok: true });
}
