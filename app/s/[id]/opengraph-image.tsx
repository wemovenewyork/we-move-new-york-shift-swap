import { ImageResponse } from "next/og";
import { getPublicSwap, categoryLabel, prettyDate } from "@/lib/publicSwap";

// Dynamic unfurl card for shared swap links. next/og is built into Next —
// no new dependency. Same field discipline as the teaser page.

export const alt = "WMNY Shift Swap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Work-order brand palette for the card.
const TRANSIT_BLACK = "#0D0D0D";
const WMNY_GOLD = "#C9A84C";
const MTA_BLUE = "#006AA4";
const TEAL = "#00C9A7";
const CHIP: Record<string, string> = { work: MTA_BLUE, daysoff: WMNY_GOLD, vacation: TEAL };

function headline(swap: NonNullable<Awaited<ReturnType<typeof getPublicSwap>>>): string {
  if (swap.category === "vacation") return swap.vacationHave ? `Swap: ${swap.vacationHave}` : "Vacation week swap";
  if (swap.category === "daysoff") {
    const from = prettyDate(swap.fromDate);
    const to = prettyDate(swap.toDate);
    if (from && to) return `${from} → ${to}`;
    return swap.fromDay || from || "Days off swap";
  }
  return prettyDate(swap.date) ?? "Work swap";
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const swap = await getPublicSwap(id);

  const unavailable = !swap || swap.status !== "open";
  const chip = swap ? CHIP[swap.category] ?? WMNY_GOLD : WMNY_GOLD;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          background: TRANSIT_BLACK, padding: 72, justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: WMNY_GOLD, letterSpacing: 4, textTransform: "uppercase" }}>
            WMNY Shift Swap
          </div>
          {swap && (
            <div style={{ display: "flex", padding: "10px 26px", borderRadius: 40, background: chip, color: "#fff", fontSize: 26, fontWeight: 700 }}>
              {categoryLabel(swap.category)}
            </div>
          )}
        </div>

        {unavailable ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}>
              No longer available
            </div>
            <div style={{ fontSize: 34, color: "#9a9a9a", marginTop: 16 }}>
              {swap ? `${swap.openCountAtDepot} open swaps at ${swap.depotName} right now` : "See what's open on WMNY Shift Swap"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 82, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}>
              {headline(swap!)}
            </div>
            <div style={{ fontSize: 36, color: WMNY_GOLD, marginTop: 20, fontWeight: 600 }}>
              {swap!.depotName}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #2a2a2a", paddingTop: 28 }}>
          <div style={{ fontSize: 30, color: "#c9c9c9" }}>
            {swap ? swap.posterMasked : ""}
          </div>
          <div style={{ fontSize: 26, color: "#7a7a7a" }}>
            invite-only · wmnyshiftswap.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
