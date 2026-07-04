// Minimal RFC 5545 iCalendar builder for all-day shift-swap events.

/** Escape a text value per RFC 5545 §3.3.11 (backslash, semicolon, comma, newlines). */
export function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** A midnight-UTC @db.Date → YYYYMMDD for a VALUE=DATE all-day event. */
export function icsDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** The day after `d` (all-day DTEND is exclusive), as YYYYMMDD. */
export function icsDatePlusOne(d: Date): string {
  const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  return icsDate(next);
}

export interface IcsEvent {
  uid: string;
  date: Date; // all-day, midnight UTC
  summary: string;
  description: string;
  url: string;
  stamp: Date; // DTSTAMP
}

// Fold lines to 75 octets per RFC 5545 §3.1 (continuation lines start with a space).
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(" " + rest);
  return parts.join("\r\n");
}

export function buildCalendar(events: IcsEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WMNY Shift Swap//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(e.stamp)}T000000Z`,
      `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
      `DTEND;VALUE=DATE:${icsDatePlusOne(e.date)}`,
      fold(`SUMMARY:${escapeICS(e.summary)}`),
      fold(`DESCRIPTION:${escapeICS(e.description)}`),
      fold(`URL:${escapeICS(e.url)}`),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  // CRLF line endings are required by RFC 5545.
  return lines.join("\r\n") + "\r\n";
}
