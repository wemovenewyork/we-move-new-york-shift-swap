import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { nyToday, parseDateOnly, validateSwapDate, oneYearOut } from "../lib/nyDate";

afterEach(() => mock.timers.reset());

test("parseDateOnly accepts strict YYYY-MM-DD as midnight UTC", () => {
  const d = parseDateOnly("2026-07-04");
  assert.ok(d);
  assert.equal(d.toISOString(), "2026-07-04T00:00:00.000Z");
});

test("parseDateOnly rejects non-date-only strings", () => {
  assert.equal(parseDateOnly(""), null);
  assert.equal(parseDateOnly("2026-7-4"), null);
  assert.equal(parseDateOnly("2026/07/04"), null);
  assert.equal(parseDateOnly("2026-07-04T10:00:00Z"), null); // the ISO-with-time ambiguity we reject
  assert.equal(parseDateOnly("garbage"), null);
  assert.equal(parseDateOnly("2026-13-40"), null); // well-formed but impossible calendar date
});

// 2026-07-04T01:00:00Z == 2026-07-03 21:00 EDT. This is the exact window the
// old `new Date()` comparison got wrong: UTC has rolled to the 4th but it is
// still the 3rd in New York.
test("nyToday: at 21:00 EDT the NY calendar date is still the same day", () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 6, 4, 1, 0, 0) });
  assert.equal(nyToday().toISOString(), "2026-07-03T00:00:00.000Z");
});

test("nyToday: at 08:00 EDT the NY calendar date matches UTC date", () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 6, 4, 12, 0, 0) });
  assert.equal(nyToday().toISOString(), "2026-07-04T00:00:00.000Z");
});

// Acceptance scenario from the work order: simulated 21:00 EDT on Jul 3.
test("validateSwapDate boundaries at simulated 21:00 EDT (today = Jul 3 NY)", () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 6, 4, 1, 0, 0) });
  const today = nyToday();
  const yearOut = oneYearOut(today);
  assert.equal(today.toISOString(), "2026-07-03T00:00:00.000Z");

  // posting tomorrow (NY) succeeds
  assert.equal(validateSwapDate("date", "2026-07-04", today, yearOut), null);
  // posting today (NY) succeeds — the whole point of A2
  assert.equal(validateSwapDate("date", "2026-07-03", today, yearOut), null);
  // posting yesterday (NY) fails
  assert.equal(validateSwapDate("date", "2026-07-02", today, yearOut), "date cannot be in the past");
});

test("validateSwapDate: one-year boundary is inclusive, beyond it fails", () => {
  const today = parseDateOnly("2026-07-03")!;
  const yearOut = oneYearOut(today);
  assert.equal(yearOut.toISOString(), "2027-07-03T00:00:00.000Z");
  assert.equal(validateSwapDate("date", "2027-07-03", today, yearOut), null); // exactly 1 year — allowed
  assert.equal(
    validateSwapDate("date", "2027-07-04", today, yearOut),
    "date cannot be more than 1 year from now",
  );
});

test("validateSwapDate: absent field is valid, malformed field is rejected", () => {
  const today = parseDateOnly("2026-07-03")!;
  const yearOut = oneYearOut(today);
  assert.equal(validateSwapDate("fromDate", undefined, today, yearOut), null);
  assert.equal(validateSwapDate("fromDate", "", today, yearOut), null);
  assert.equal(validateSwapDate("fromDate", "07/03/2026", today, yearOut), "Invalid fromDate");
});
