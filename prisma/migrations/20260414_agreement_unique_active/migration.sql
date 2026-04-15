-- Prevent race-condition duplicate agreements on the same swap.
-- Only one agreement may be active (pending or userA_confirmed) per swap at a time.
-- Completed/cancelled agreements are excluded so a swap can be re-agreed after cancellation.
CREATE UNIQUE INDEX IF NOT EXISTS "swap_agreements_swap_id_active_key"
  ON "swap_agreements" ("swap_id")
  WHERE status IN ('pending', 'userA_confirmed');
