import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/apiResponse";

export async function GET() {
  const depots = await prisma.depot.findMany({ orderBy: { name: "asc" } });
  const counts = await prisma.swap.groupBy({
    by: ["depotId"],
    _count: { id: true },
    where: { status: "open" },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.depotId, c._count.id]));
  return ok(depots.map((d) => ({ ...d, openSwaps: countMap[d.id] ?? 0 })));
}
