import { prisma } from "@/lib/prisma";
import { err } from "@/lib/apiResponse";

export async function GET() {
  try {
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
  } catch {
    return err("Unable to load depots — please try again", 503);
  }
}
