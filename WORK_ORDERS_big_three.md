# Work Orders — Big Three Fixes

Two branches. Branch 1 is mechanical and shippable same-day. Branch 2 is a redesign — read the spec fully before writing code.

---

# BRANCH 1 · `fix/data-retention-and-timezone` (A1 + A2 + A3)

## A1 — Stop the cleanup cron from destroying live data

**File:** `app/api/cron/cleanup-swaps/route.ts`

Current behavior deletes swaps 7 days after `filled`/`expired`, cascading away messages, agreements (the printable dispatcher proof), and reports.

### Step 1 — Schema: soft archive
In `prisma/schema.prisma`, add to `Swap`:
```prisma
archivedAt DateTime? @map("archived_at")
```
Add index: `@@index([archivedAt])`. Create migration `soft_archive_swaps`.

### Step 2 — Rewrite the cron
Replace `deleteMany` with a two-phase policy:

**Phase A — archive (replaces current delete):** swaps `filled`/`expired`, `updatedAt` > 7 days old, `archivedAt: null` → set `archivedAt: now()`. Archived swaps disappear from the board but stay reachable.

**Phase B — hard delete (true garbage only):** swaps where ALL of:
- `archivedAt` > 90 days ago
- effective shift date in the past — compute as the max of `date`, `fromDate`, `toDate` (any that exist; vacation swaps with no dates: fall back to `createdAt` + 180d)
- no report with `status: "pending"` on the swap
- no agreement with `status: "completed"` whose swap shift date is still in the future (redundant with the date check, but keep it explicit as a guard)

### Step 3 — Hide archived from lists, keep detail reachable
- `app/api/swaps/route.ts` GET: add `{ archivedAt: null }` to `andClauses`.
- `app/api/swaps/saved/route.ts` and `app/api/users/me/swaps/route.ts`: same filter on list queries **except** "my history" style views — `app/api/users/me/history/route.ts` should INCLUDE archived (that's the point of history).
- `app/api/swaps/[id]/route.ts` GET (detail) and the print page's data source: do NOT filter — participants keep access to old agreements. If the detail route is currently open to any depot member, restrict archived swaps to participants: swap owner, or anyone with an agreement/message on it.

### Step 4 — Report evidence
In `app/api/admin/reports/route.ts`, verify the admin queue still renders a report whose swap is archived (it will, since we no longer delete). For the eventual hard delete in Phase B, the `pending`-report guard protects open cases; resolved reports older than 90 days deleting with the swap is acceptable.

**Acceptance:**
- Fill a swap dated 60 days out → 8 days later it's off the board but `/print` still renders for both parties.
- A pending report's swap is never hard-deleted.
- `tsc --noEmit`, eslint, `next build` clean. Update RUNBOOK.md retention section.

---

## A2 — Fix date validation timezone (same-day + evening posts)

**Files:** `app/api/swaps/route.ts` (POST), `app/api/swaps/[id]/route.ts` (PUT shares the logic), `app/api/cron/expire-swaps/route.ts`

### Step 1 — New util `lib/nyDate.ts`
```ts
/** Midnight-UTC Date representing today's calendar date in America/New_York. */
export function nyToday(): Date {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());               // "2026-07-03"
  return new Date(`${s}T00:00:00Z`);
}

/** Parse a YYYY-MM-DD string to midnight-UTC, or null if malformed. */
export function parseDateOnly(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}
```

### Step 2 — Replace validation in POST and PUT
```ts
const today = nyToday();
const oneYearOut = new Date(today); oneYearOut.setUTCFullYear(oneYearOut.getUTCFullYear() + 1);
// per field:
const d = parseDateOnly(val as string);
if (!d) return err(`Invalid ${field}`, 400);
if (d < today) return err(`${field} cannot be in the past`, 400);   // TODAY IS NOW VALID
if (d > oneYearOut) return err(`${field} cannot be more than 1 year from now`, 400);
```
Key changes: `d < today` (calendar comparison, not instant), today allowed, strict `YYYY-MM-DD` format enforced (rejects the ISO-with-time strings that caused the UTC ambiguity).

### Step 3 — Refactor the expire cron to import `nyToday()` instead of its inline copy. Behavior unchanged; one source of truth.

### Step 4 — Frontend check
The swap form's date input min-attribute likely also computes "today" from client local time — usually fine (client IS in NY) but verify it doesn't block today.

**Acceptance:** with server TZ forced to UTC, at simulated 21:00 EDT posting `date = tomorrow (NY)` succeeds and `date = today (NY)` succeeds; `yesterday` fails. Expire cron behavior byte-identical.

---

## A3 — Guard agreement state transitions (do it while we're here)

**File:** `app/api/swaps/[id]/agreement/route.ts` (PATCH)

Both `cancel` and `confirm` currently `update` unconditionally after an unguarded `findFirst`. Convert both to guarded writes inside their transactions:

```ts
const res = await tx.swapAgreement.updateMany({
  where: { id: agreement.id, status: { in: ["pending", "userA_confirmed"] } },
  data: { status: "cancelled" },
});
if (res.count === 0) {
  throw Object.assign(new Error("CONFLICT"), { code: "AGREEMENT_FINALIZED" });
}
```
Catch outside the transaction → `err("This agreement was already finalized", 409)`. Same pattern in `completeAgreement` with `status: "pending"` (or `"userA_confirmed"` for the compat path) in the where. This kills: cancel-after-confirm reopening a filled swap, and double-confirm double-incrementing reputation.

**Acceptance:** two racing PATCH calls (confirm + cancel) → exactly one succeeds, one gets 409; swap status matches the winner; reputation incremented once.

---

# BRANCH 2 · `feat/trust-system-v2` (A4 + A5) — read fully first

## Design summary

**Today:** stranger taps → agreement `pending` → swap locked → owner's only exit is "cancel" (+1 cancelled ding) → reviews/noShow never written → scores decorative.

**Target:**
1. Proposals don't lock anything. Multiple concurrent proposals per swap.
2. Owner **accepts** (locks swap + agreement) or **declines** (free, no reputation effect).
3. Backing out **after acceptance** is a real `cancelled` ding — for either party.
4. The day after the shift, both parties get *"Did the swap happen?"* — answers drive `completed` / `noShow` and open the review prompt. This is the ONLY source of completed/noShow truth.
5. Scores recalibrated so labels mean something.

## Schema changes (one migration: `trust_v2`)

```prisma
enum AgreementStatus {
  pending          // = proposal awaiting owner  (reuse existing value)
  userA_confirmed  // legacy — keep for old rows, never write new
  accepted         // NEW — owner accepted, swap locked
  completed        // NEW MEANING — both parties confirmed it happened post-shift
  cancelled
  declined         // NEW — owner said no; no reputation effect
  disputed         // NEW — parties disagree on whether it happened
}
```
On `SwapAgreement` add:
```prisma
acceptedAt        DateTime? @map("accepted_at")
userAHappened     Boolean?  @map("user_a_happened")   // post-shift answers
userBHappened     Boolean?  @map("user_b_happened")
shiftDate         DateTime? @map("shift_date") @db.Date  // denormalized from swap at accept time
@@index([status, shiftDate])
```
On `Review`: `@@unique([swapId, reviewerId])`.

**Partial unique index migration (CRITICAL — see schema comment about the existing raw index):** replace `swap_agreements_swap_id_active_key` — the "only one active" constraint must now apply to `('accepted')` only, NOT `pending`. Multiple pending proposals per swap are the point. Raw SQL in the migration:
```sql
DROP INDEX "swap_agreements_swap_id_active_key";
CREATE UNIQUE INDEX "swap_agreements_swap_id_accepted_key"
  ON "swap_agreements" ("swap_id") WHERE status IN ('accepted', 'userA_confirmed');
```
Keep `userA_confirmed` in the predicate so legacy in-flight rows can't be double-accepted. Also add a plain partial unique to prevent duplicate proposals from the same user: `UNIQUE (swap_id, user_a_id) WHERE status = 'pending'`.

## Endpoint changes — `app/api/swaps/[id]/agreement/route.ts`

**POST (propose):**
- Do NOT touch swap status (delete the `swap.update → pending` from the transaction).
- Allow while swap is `open`. Duplicate pending proposal from same user → 409 via the new partial unique.
- Keep block check + rate limit. Notify owner: "X proposed a swap — review it".

**PATCH — actions become:** `accept` (owner only), `decline` (owner only), `cancel` (either party), `confirm_happened` / `report_noshow` (post-shift, either party).

- `accept`: guarded transition `pending → accepted` + swap → `pending` + stamp `acceptedAt`, `shiftDate` (max of swap `date`/`fromDate`/`toDate`; null for undated vacation swaps — see cron note). Auto-decline all OTHER pending proposals on the swap in the same transaction + notify those proposers ("owner went with someone else — no ding"). P2002 on the accepted-unique → 409.
- `decline`: `pending → declined`. No reputation writes. Notify proposer neutrally.
- `cancel`: on `pending` (proposer withdrawing own proposal) → no ding. On `accepted` → ding the canceller (`cancelled +1`), swap → `open`, notify other party. Guarded updateMany everywhere.
- Post-shift actions: set `userXHappened`. When both true → `completed`, `completed +1` both, prompt reviews. One true + one false → `disputed`, no auto-ding, surface in admin queue (admin resolves → sets noShow manually). Both false → `cancelled` retroactively, no ding (they mutually called it off).
- `report_noshow` (one says no, doesn't respond scenarios): if one party answers "didn't happen, they no-showed" and the other never responds within 7 days → cron finalizes: responder unaffected, non-responder gets `noShow +1`. Conservative: never noShow someone who responded.

**Swap board/status interplay:**
- `app/api/swaps/[id]/status/route.ts`: block owner setting `open` while an `accepted` agreement exists (409, "cancel the agreement first"). Only increment `completed` on guarded `open→filled` transition — or better per audit A6: **stop granting reputation from manual fill entirely**; manual fill = swap closed, no rep. Reputation flows only from confirmed agreements now.
- Swap stays `pending` from accept until: post-shift completion (→ `filled`) or cancel (→ `open`).

## New cron — `app/api/cron/agreement-followups/route.ts` (daily, 13:00 UTC ≈ 9am ET)

1. **Proposal expiry:** `pending` proposals older than 48h → `declined` (system), notify proposer. (Also fold into expire-swaps: when a swap expires, decline its pending proposals — audit A8.)
2. **Post-shift prompt:** `accepted` agreements with `shiftDate < nyToday()` and no answers → notify both: "Did your swap with X happen? Confirm to build your reputation." Deep-link to the agreement.
3. **Non-response finalize:** `accepted`, shiftDate > 7 days past, one/zero answers → apply the conservative rules above. Zero answers from both → mark `completed` with NO reputation change (assume fine, but unverified swaps earn nothing).
4. `shiftDate: null` (undated vacation swaps): prompt at `acceptedAt + 30d` instead.

Register in `vercel.json`.

## Score recalibration — `lib/reputation.ts`

```ts
export function calcScore(r: RepData): RepScore {
  const total = r.completed + r.cancelled + r.noShow;
  if (total < 3) return { score: 0, label: "New", ... };        // no label farming
  const reliability = (r.completed / total) * 100;
  const hasReviews = r.reviews.length >= 3;
  const avgRating = hasReviews ? avg(r.reviews) : null;
  const score = Math.round(hasReviews
    ? reliability * 0.6 + (avgRating! * 20) * 0.4
    : reliability);                                              // no phantom 5.0 default
  // Elite additionally requires total >= 10
  ...
}
```
Thresholds stay (90/75/50) but Elite gated on `total >= 10`. Update the reputation explainer in Help/FAQ copy.

## Reviews — new route `app/api/swaps/[id]/review/route.ts`
POST `{ rating: 1–5 }` — allowed only for agreement participants, only after that agreement is `completed`, one per user per swap (the new unique enforces). Rate-limit lightly. Surface prompt in the post-shift confirmation flow UI.

## UI work (summary — the Code session should enumerate exact components)
- Swap detail: owner sees pending proposals list with Accept/Decline; proposer sees "proposal sent" state.
- Agreement page: accepted state + post-shift "Did it happen?" card (✓ It happened / ✗ It didn't) + review stars after completion.
- Board: swaps with proposals still show as open (that's the fix); accepted = pending badge as today.
- i18n: all new strings in EN/ES/中文 (`lib/i18n.ts` pattern).

## Migration / rollout notes
- Legacy `pending` rows at deploy time were created under lock-semantics (their swap is `pending`). Migration script: for each legacy `pending` agreement, set its swap back to `open` (un-lock) — they're now just proposals. `userA_confirmed` rows: leave, compat path in PATCH stays until they drain, then delete the code.
- Reputation counters: existing `completed` values were farmable/manual — accept the history, don't rewrite; the `total >= 3` gate mutes the worst inflation immediately.
- Ship behind nothing — this is a behavior fix, not a risky feature. But deploy to the Neon preview branch first (M4 — do M4 before this branch).

**Acceptance (end-to-end):**
1. Three users propose on one swap → swap stays open on the board → owner accepts one → other two auto-declined with neutral notification, no dings anywhere → swap shows pending.
2. Owner declines a proposal → proposer notified, both reputations untouched.
3. Accepted party cancels → canceller +1 cancelled, swap reopens.
4. Shift date passes → both prompted → both confirm → both +1 completed, review prompts appear, one review each accepted, second attempt 409.
5. One confirms, other silent 7 days → silent party +1 noShow.
6. New user with 1 completed → label "New", not "Elite".
