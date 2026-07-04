"use client";

import { useEffect } from "react";

// A7/growth attribution: when a shared teaser link carries ?src=share, drop a
// short-lived first-party cookie. On register the API reads it into
// User.signupSource. Client-side because Server Components can't set cookies,
// and this only needs to fire for real humans clicking through (not crawlers).
export default function AttributionCapture({ src }: { src: string | null }) {
  useEffect(() => {
    if (!src) return;
    // Allowlist known sources; ignore anything else so the column stays clean.
    if (src !== "share") return;
    const sevenDays = 7 * 24 * 60 * 60;
    document.cookie = `wmny_src=${encodeURIComponent(src)}; path=/; max-age=${sevenDays}; SameSite=Lax`;
  }, [src]);
  return null;
}
