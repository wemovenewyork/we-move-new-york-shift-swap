import { getAppUrl } from "@/lib/appUrl";

// Client-side share helper. The shared link is always the PUBLIC teaser
// (/s/[id]) — field-disciplined and unfurls in chat apps — with ?src=share
// for signup attribution. getAppUrl() covers prod (inlined NEXT_PUBLIC_APP_URL);
// window.location.origin is the fallback on preview where it isn't set.

export function swapShareUrl(id: string): string {
  const base = getAppUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/s/${id}?src=share`;
}

/**
 * Native share sheet when available (mobile), else clipboard copy with an
 * onCopied callback so the caller can toast "Link copied". Deliberately no
 * swap details in the share text — treat everything as public.
 */
export async function shareSwap(id: string, onCopied: () => void): Promise<void> {
  const url = swapShareUrl(id);
  const payload = { title: "WMNY Shift Swap", text: "Shift swap — WMNY Shift Swap", url };
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share(payload).catch(() => {});
    return;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(url).catch(() => {});
    onCopied();
  }
}
