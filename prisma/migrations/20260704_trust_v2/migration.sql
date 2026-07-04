-- Trust system v2 (A4 + A5).
--
-- SANCTIONED EXCEPTION: this migration drops the raw partial unique index
-- swap_agreements_swap_id_active_key (the one the old schema comment said
-- never to drop). Trust v2 changes the invariant: multiple *pending* proposals
-- per swap are now the point; only one *accepted* agreement may exist.
--
-- The enum is recreated (not ALTER TYPE ... ADD VALUE) because the new
-- 'accepted' value is used in an index predicate later in this same
-- transaction — Postgres forbids using values added via ADD VALUE inside the
-- transaction that added them. A freshly created type has no such limit.

-- 1. Drop the old "one active agreement" partial unique. Must precede the
--    column retype: an index predicate on "status" blocks ALTER COLUMN TYPE.
DROP INDEX "swap_agreements_swap_id_active_key";

-- 2. Recreate AgreementStatus with the trust-v2 values.
CREATE TYPE "AgreementStatus_new" AS ENUM ('pending', 'userA_confirmed', 'accepted', 'completed', 'cancelled', 'declined', 'disputed');
ALTER TABLE "swap_agreements" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "swap_agreements" ALTER COLUMN "status" TYPE "AgreementStatus_new" USING ("status"::text::"AgreementStatus_new");
DROP TYPE "AgreementStatus";
ALTER TYPE "AgreementStatus_new" RENAME TO "AgreementStatus";
ALTER TABLE "swap_agreements" ALTER COLUMN "status" SET DEFAULT 'pending';

-- 3. Trust-v2 columns on swap_agreements.
ALTER TABLE "swap_agreements" ADD COLUMN "accepted_at" TIMESTAMP(3);
ALTER TABLE "swap_agreements" ADD COLUMN "user_a_happened" BOOLEAN;
ALTER TABLE "swap_agreements" ADD COLUMN "user_b_happened" BOOLEAN;
ALTER TABLE "swap_agreements" ADD COLUMN "shift_date" DATE;

-- 4. New partial uniques. userA_confirmed stays in the accepted-scope
--    predicate so legacy in-flight rows can't be double-accepted.
CREATE UNIQUE INDEX "swap_agreements_swap_id_accepted_key"
  ON "swap_agreements" ("swap_id") WHERE status IN ('accepted', 'userA_confirmed');
CREATE UNIQUE INDEX "swap_agreements_swap_user_pending_key"
  ON "swap_agreements" ("swap_id", "user_a_id") WHERE status = 'pending';

-- 5. Cron lookup index (status, shift_date).
CREATE INDEX "swap_agreements_status_shift_date_idx" ON "swap_agreements"("status", "shift_date");

-- 6. One review per user per swap.
CREATE UNIQUE INDEX "reviews_swap_id_reviewer_id_key" ON "reviews"("swap_id", "reviewer_id");

-- 7. Legacy data: pre-trust-v2 pending agreements were created under
--    lock-semantics (their swap was moved to 'pending' at propose time).
--    They are now just proposals — unlock their swaps. Scoped to swaps that
--    are actually in 'pending' so a filled/expired swap is never reopened.
UPDATE "swaps" SET "status" = 'open'
WHERE "status" = 'pending'
  AND "id" IN (SELECT "swap_id" FROM "swap_agreements" WHERE "status" = 'pending');
