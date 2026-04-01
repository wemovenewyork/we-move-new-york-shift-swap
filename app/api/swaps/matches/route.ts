import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// Returns swaps in the user's depot that are complementary to their own open swaps.
// Matching logic:
//   work    → other operator wants something the poster has (same route/time window)
//   daysoff → fromDay of A == toDay of B and toDay of A == fromDay of B
//   vacation → vacationHave of A == vacationWant of B and vacationWant of A == vacationHave of B
export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser?.depotId) return err("Set your depot first", 400);

  // Get the current user's open swaps
  const mySwaps = await prisma.swap.findMany({
    where: { userId: user.userId, status: "open" },
  });

  if (mySwaps.length === 0) return ok([]);

  // Get all open swaps in the depot from OTHER users
  const depotSwaps = await prisma.swap.findMany({
    where: { depotId: dbUser.depotId, status: "open", userId: { not: user.userId } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Score each depot swap against each of my swaps
  const matchMap = new Map<string, { swap: typeof depotSwaps[0]; score: number; mySwapId: string; reason: string }>();

  for (const mine of mySwaps) {
    for (const theirs of depotSwaps) {
      if (mine.category !== theirs.category) continue;

      let score = 0;
      let reason = "";

      if (mine.category === "daysoff") {
        if (
          mine.fromDay && mine.toDay &&
          theirs.fromDay && theirs.toDay &&
          mine.fromDay === theirs.toDay &&
          mine.toDay === theirs.fromDay
        ) {
          score = 100;
          reason = `You want ${mine.toDay} ↔ they want ${mine.fromDay}`;
        }
      } else if (mine.category === "vacation") {
        if (
          mine.vacationHave && mine.vacationWant &&
          theirs.vacationHave && theirs.vacationWant &&
          mine.vacationHave === theirs.vacationWant &&
          mine.vacationWant === theirs.vacationHave
        ) {
          score = 100;
          reason = `You have ${mine.vacationHave} and want ${mine.vacationWant} — they have ${theirs.vacationHave} and want ${theirs.vacationWant}`;
        }
      } else if (mine.category === "work") {
        // Partial match: same route scores 60, similar start time window (+/- 2h) adds 40
        if (mine.route && theirs.route && mine.route === theirs.route) {
          score += 60;
          reason = `Same route (${mine.route})`;
        }
        if (mine.startTime && theirs.startTime) {
          const [mh] = mine.startTime.split(":").map(Number);
          const [th] = theirs.startTime.split(":").map(Number);
          if (Math.abs(mh - th) <= 2) {
            score += 40;
            reason += reason ? " · similar hours" : "Similar hours";
          }
        }
      }

      if (score > 0) {
        const existing = matchMap.get(theirs.id);
        if (!existing || existing.score < score) {
          matchMap.set(theirs.id, { swap: theirs, score, mySwapId: mine.id, reason });
        }
      }
    }
  }

  const results = Array.from(matchMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ swap, score, mySwapId, reason }) => ({
      ...swap,
      _matchScore: score,
      _mySwapId: mySwapId,
      _matchReason: reason,
    }));

  return ok(results);
}
