-- Partial unique indexes — NOT expressible in schema.prisma.
--
-- Prisma's schema language has no syntax for a UNIQUE INDEX with a WHERE
-- clause, so these live only as raw SQL in prisma/migrations/. That is fine
-- for production and preview, which are built by `prisma migrate deploy`.
--
-- It is NOT fine for any database built with `prisma db push` (CI, a fresh
-- local scratch DB), because db push syncs from schema.prisma and silently
-- omits them. The visible symptom is conflict tests returning 201 instead of
-- 409: without the pending index, a duplicate proposal inserts cleanly instead
-- of tripping P2002.
--
-- CI cannot use `migrate deploy` today: the migration history does not replay
-- from scratch. Prisma orders migrations by their numeric prefix, and the
-- hand-named 8-digit dirs (20260401_add_agreements_push_roles) sort ahead of
-- the real 14-digit baseline (20260401214939_init), so the first migration
-- applied tries to ALTER a users table that does not exist yet. Renaming those
-- dirs would desync _prisma_migrations on live databases, so CI does
-- `db push` + this file instead.
--
-- Keep this file in sync when a migration adds or changes a partial index.

-- One live (accepted) agreement per swap.
CREATE UNIQUE INDEX IF NOT EXISTS "swap_agreements_swap_id_accepted_key"
  ON "swap_agreements" ("swap_id")
  WHERE status IN ('accepted', 'userA_confirmed');

-- One pending proposal per (swap, proposer) — the 409 duplicate-proposal path.
CREATE UNIQUE INDEX IF NOT EXISTS "swap_agreements_swap_user_pending_key"
  ON "swap_agreements" ("swap_id", "user_a_id")
  WHERE status = 'pending';
