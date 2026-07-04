import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/reputation";

// Field-disciplined projection of a swap for the PUBLIC teaser (app/s/[id])
// and its OG image. EVERYTHING here is treated as public-internet-visible:
// no `details` free text, no `contact`, no last names, no proposal data.

export type PublicSwapStatus = "open" | "unavailable";

export interface PublicSwap {
  id: string;
  category: "work" | "daysoff" | "vacation";
  status: PublicSwapStatus;
  depotName: string;
  depotCode: string;
  // Structured shift fields only (never details/contact):
  date: string | null; // YYYY-MM-DD
  fromDate: string | null;
  toDate: string | null;
  fromDay: string | null;
  toDay: string | null;
  startTime: string | null;
  clearTime: string | null;
  vacationHave: string | null;
  vacationWant: string | null;
  posterMasked: string; // "First L."
  reputationLabel: string; // label only, no counts
  openCountAtDepot: number; // for the unavailable state
}

const CATEGORY_LABEL: Record<string, string> = {
  work: "Work Swap",
  daysoff: "Days Off Swap",
  vacation: "Vacation Swap",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? "Swap";
}

/** Mask a full name to "First L." — mirrors the board/saved list masking. */
export function maskPosterName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length < 2 ? parts[0] ?? "" : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/** @db.Date values are midnight UTC — format in UTC to avoid an off-by-one. */
export function formatDateOnly(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function prettyDate(ymd: string | null): string | null {
  if (!ymd) return null;
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Fetch the public projection of a swap. Returns null for a nonexistent id
 * (the caller renders a generic not-found — no existence oracle). A swap that
 * is not open (pending/filled/expired) OR archived is returned with
 * status "unavailable".
 */
export async function getPublicSwap(id: string): Promise<PublicSwap | null> {
  // Guard against malformed ids hitting the DB with a bad uuid cast.
  if (!/^[0-9a-fA-F-]{16,40}$/.test(id)) return null;

  let swap;
  try {
    swap = await prisma.swap.findUnique({
      where: { id },
      select: {
        id: true, category: true, status: true, archivedAt: true,
        date: true, fromDate: true, toDate: true, fromDay: true, toDay: true,
        startTime: true, clearTime: true, vacationHave: true, vacationWant: true,
        posterName: true, userId: true, depotId: true,
        depot: { select: { name: true, code: true } },
      },
    });
  } catch {
    return null;
  }
  if (!swap) return null;

  const isOpen = swap.status === "open" && swap.archivedAt == null;

  const [rep, reviews, openCount] = await Promise.all([
    prisma.reputation.findUnique({ where: { userId: swap.userId } }),
    prisma.review.findMany({ where: { reviewedId: swap.userId }, select: { rating: true } }),
    prisma.swap.count({ where: { depotId: swap.depotId, status: "open", archivedAt: null } }),
  ]);
  const reputationLabel = calcScore({
    completed: rep?.completed ?? 0,
    cancelled: rep?.cancelled ?? 0,
    noShow: rep?.noShow ?? 0,
    reviews: reviews.map((r) => r.rating),
  }).label;

  return {
    id: swap.id,
    category: swap.category as PublicSwap["category"],
    status: isOpen ? "open" : "unavailable",
    depotName: swap.depot?.name ?? "your depot",
    depotCode: swap.depot?.code ?? swap.depotId,
    date: formatDateOnly(swap.date),
    fromDate: formatDateOnly(swap.fromDate),
    toDate: formatDateOnly(swap.toDate),
    fromDay: swap.fromDay,
    toDay: swap.toDay,
    startTime: swap.startTime,
    clearTime: swap.clearTime,
    vacationHave: swap.vacationHave,
    vacationWant: swap.vacationWant,
    posterMasked: maskPosterName(swap.posterName),
    reputationLabel,
    openCountAtDepot: openCount,
  };
}
