// Guarded state-transition helpers for swap agreements.
//
// The PATCH handler reads an agreement with findFirst, then mutates it. Two
// concurrent requests (e.g. one party confirms while the other cancels) both
// pass the read and then both write — reopening a filled swap, or double-
// incrementing reputation. The fix: perform the write as an `updateMany`
// scoped to the *expected* current status, and treat a zero-row result as a
// lost race. These helpers make that pattern explicit and unit-testable.

export const AGREEMENT_FINALIZED = "AGREEMENT_FINALIZED";

/**
 * Throw a tagged conflict error when a guarded updateMany matched no rows,
 * meaning another request already moved the agreement out of the expected
 * state. Call inside the transaction so it rolls back.
 */
export function assertRowsUpdated(count: number): void {
  if (count === 0) {
    throw Object.assign(new Error("CONFLICT"), { code: AGREEMENT_FINALIZED });
  }
}

/** True when an error is the tagged "already finalized" conflict. */
export function isFinalizedConflict(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === AGREEMENT_FINALIZED
  );
}
