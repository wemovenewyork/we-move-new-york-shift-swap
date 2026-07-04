// Timezone-correct date handling for swap dates.
//
// Swap dates are stored as @db.Date (midnight UTC, no time component). The bug
// this fixes: comparing a stored date against `new Date()` (an instant) means
// that between ~20:00 and 24:00 New York time, UTC has already rolled to the
// next calendar day — so "today in NY" was treated as past, and same-day swaps
// were wrongly rejected. Everything here works in calendar-date space anchored
// to America/New_York, comparing midnight-UTC Dates to midnight-UTC Dates.

/** Midnight-UTC Date representing today's calendar date in America/New_York. */
export function nyToday(): Date {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // "2026-07-04"
  return new Date(`${s}T00:00:00Z`);
}

/** Parse a YYYY-MM-DD string to midnight-UTC, or null if malformed. */
export function parseDateOnly(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Validate one optional swap date field against the allowed window
 * [today, today + 1 year], comparing calendar dates (not instants).
 * Returns an error message string, or null when the value is valid/absent.
 * Same-day is allowed; strict YYYY-MM-DD format is required (rejects the
 * ISO-with-time strings that caused the original UTC ambiguity).
 */
export function validateSwapDate(
  field: string,
  value: unknown,
  today: Date,
  oneYearOut: Date,
): string | null {
  if (value == null || value === "") return null; // field is optional
  if (typeof value !== "string") return `Invalid ${field}`;
  const d = parseDateOnly(value);
  if (!d) return `Invalid ${field}`;
  if (d < today) return `${field} cannot be in the past`;
  if (d > oneYearOut) return `${field} cannot be more than 1 year from now`;
  return null;
}

/** today + 1 calendar year, in the same midnight-UTC space as nyToday(). */
export function oneYearOut(today: Date): Date {
  const d = new Date(today);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}
