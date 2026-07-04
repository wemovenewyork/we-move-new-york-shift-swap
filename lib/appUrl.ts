/**
 * Server-side base URL for building absolute links (emails, deep-links).
 *
 * Prefers the explicit NEXT_PUBLIC_APP_URL. On preview deploys — where we
 * deliberately DON'T set that (no stable preview domain) — it falls back to
 * the Vercel-provided per-deployment URL so links resolve to the running
 * preview instead of being empty. Returns "" when neither is available
 * (local dev without config), preserving existing "if (!appUrl)" guards.
 *
 * Server-only: VERCEL_URL is not exposed to the browser bundle. Client code
 * must use window.location.origin (see app/depot/[code]/rep/page.tsx).
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "";
}
