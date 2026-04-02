import { prisma } from "@/lib/prisma";

export async function GET() {
  const depots = await prisma.depot.findMany({ orderBy: { name: "asc" } });
  const counts = await prisma.swap.groupBy({
    by: ["depotId"],
    _count: { id: true },
    where: { status: "open" },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.depotId, c._count.id]));
  const data = depots.map((d) => ({ ...d, openSwaps: countMap[d.id] ?? 0 }));

  return Response.json(data, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Cache at Vercel's edge CDN for 5 minutes, allow stale for 30s while revalidating
      "Cache-Control": "s-maxage=300, stale-while-revalidate=30",
    },
  });
}
