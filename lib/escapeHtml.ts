/**
 * Escapes user-controlled input before interpolation into HTML email templates.
 * Always use this for any user-supplied string rendered in email HTML.
 * Ampersand is escaped first to prevent double-escaping.
 */
export function escapeHtml(input: string | null | undefined): string {
  if (input == null) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
