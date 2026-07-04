import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";
import { getAppUrl } from "@/lib/appUrl";
import { getPublicSwap, categoryLabel, prettyDate, PublicSwap } from "@/lib/publicSwap";

// Public, logged-out-safe teaser for a single swap — the shareable link that
// unfurls in chat apps. Field discipline lives in lib/publicSwap (no details,
// contact, last names, or proposal data). noindex: these are for unfurls.

const BRAND = { bg: "#010028", gold: "#D1AD38", blue: "#0249B5", teal: "#00C9A7", white: "#FFF", mut: "rgba(255,255,255,.6)" };
const CHIP: Record<string, string> = { work: BRAND.blue, daysoff: BRAND.gold, vacation: BRAND.teal };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const swap = await getPublicSwap(id);
  const base = getAppUrl();
  const ogUrl = base ? `${base}/s/${id}/opengraph-image` : undefined;
  if (!swap) {
    return { title: "WMNY Shift Swap", robots: { index: false, follow: false } };
  }
  const title = swap.status === "open"
    ? `${categoryLabel(swap.category)} at ${swap.depotName} — WMNY Shift Swap`
    : `Swap no longer available — WMNY Shift Swap`;
  const description = swap.status === "open"
    ? `${swap.posterMasked} needs coverage at ${swap.depotName}. Sign in to respond.`
    : `This swap is taken. ${swap.openCountAtDepot} open swaps at ${swap.depotName} right now.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, images: ogUrl ? [ogUrl] : [], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: ogUrl ? [ogUrl] : [] },
  };
}

async function signedInDepotCode(): Promise<string | null> {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { depot: { select: { code: true } } },
    });
    return user?.depot?.code ?? null;
  } catch {
    return null;
  }
}

export default async function PublicSwapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const swap = await getPublicSwap(id);

  if (!swap) {
    return (
      <Shell>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: BRAND.white, margin: "0 0 8px" }}>Swap not found</h1>
        <p style={{ fontSize: 14, color: BRAND.mut, lineHeight: 1.6 }}>This link doesn&apos;t point to a swap we can show.</p>
        <CTA />
      </Shell>
    );
  }

  // Signed-in members with access to this depot go straight to the real detail.
  const depotCode = await signedInDepotCode();
  if (depotCode && depotCode === swap.depotCode) {
    redirect(`/depot/${swap.depotCode}/swaps/${swap.id}`);
  }

  if (swap.status !== "open") {
    return (
      <Shell>
        <StatusPill text="No longer available" color="#888" />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: BRAND.white, margin: "10px 0 8px" }}>This swap is no longer available</h1>
        <p style={{ fontSize: 14, color: BRAND.mut, lineHeight: 1.6, marginBottom: 4 }}>
          It was taken or expired — but there are <strong style={{ color: BRAND.gold }}>{swap.openCountAtDepot} open swap{swap.openCountAtDepot === 1 ? "" : "s"}</strong> at {swap.depotName} right now.
        </p>
        <CTA />
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ padding: "4px 12px", borderRadius: 20, background: (CHIP[swap.category] ?? BRAND.gold) + "22", border: `1px solid ${(CHIP[swap.category] ?? BRAND.gold)}55`, color: CHIP[swap.category] ?? BRAND.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          {categoryLabel(swap.category)}
        </span>
        <StatusPill text="Open" color={BRAND.teal} />
      </div>

      <div style={{ fontSize: 26, fontWeight: 800, color: BRAND.white, lineHeight: 1.2, marginBottom: 10 }}>
        <SwapHeadline swap={swap} />
      </div>
      <ShiftTimes swap={swap} />

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.white }}>{swap.posterMasked}</div>
          <div style={{ fontSize: 12, color: BRAND.mut }}>{swap.depotName}</div>
        </div>
        {swap.reputationLabel !== "New" && (
          <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(209,173,56,.12)", border: "1px solid rgba(209,173,56,.35)", color: BRAND.gold, fontSize: 11, fontWeight: 700 }}>
            {swap.reputationLabel}
          </span>
        )}
      </div>

      <CTA />
    </Shell>
  );
}

function SwapHeadline({ swap }: { swap: PublicSwap }) {
  if (swap.category === "vacation") {
    return <>{swap.vacationHave ? `Wants to swap ${swap.vacationHave}` : "Vacation week swap"}</>;
  }
  if (swap.category === "daysoff") {
    const from = prettyDate(swap.fromDate);
    const to = prettyDate(swap.toDate);
    if (from && to) return <>{from} → {to}</>;
    return <>{swap.fromDay || from || "Days off swap"}</>;
  }
  return <>{prettyDate(swap.date) ?? "Work swap"}</>;
}

function ShiftTimes({ swap }: { swap: PublicSwap }) {
  if (swap.category !== "work") return null;
  const bits: string[] = [];
  if (swap.startTime) bits.push(`Start ${swap.startTime}`);
  if (swap.clearTime) bits.push(`Clear ${swap.clearTime}`);
  if (!bits.length) return null;
  return <div style={{ fontSize: 14, color: BRAND.mut }}>{bits.join(" · ")}</div>;
}

function StatusPill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ padding: "4px 12px", borderRadius: 20, background: color + "22", border: `1px solid ${color}55`, color, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
      {text}
    </span>
  );
}

function CTA() {
  return (
    <div style={{ marginTop: 22 }}>
      <Link href="/login" style={{ display: "block", textAlign: "center", padding: "14px 20px", borderRadius: 14, background: `linear-gradient(135deg,${BRAND.gold},${BRAND.gold}dd)`, color: BRAND.bg, fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
        Sign in to respond
      </Link>
      <p style={{ fontSize: 12, color: BRAND.mut, textAlign: "center", lineHeight: 1.6, marginTop: 12 }}>
        New here? WMNY Shift Swap is <strong style={{ color: BRAND.white }}>invite-only</strong> — ask a coworker for a code.
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: BRAND.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 18, textAlign: "center" }}>
          WMNY Shift Swap
        </div>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
