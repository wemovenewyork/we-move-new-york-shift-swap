-- Add missing columns to users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verify_token"   TEXT,
  ADD COLUMN IF NOT EXISTS "email_verify_expires"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "terms_accepted_at"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "terms_version"         TEXT,
  ADD COLUMN IF NOT EXISTS "login_attempts"        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspended_until"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_active_at"        TIMESTAMP(3);

-- Add subAdmin value to UserRole enum (safe in PG 12+)
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'subAdmin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create saved_swaps table
CREATE TABLE IF NOT EXISTS "saved_swaps" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "swap_id"    TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_swaps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "saved_swaps_user_id_swap_id_key" ON "saved_swaps"("user_id", "swap_id");
CREATE INDEX IF NOT EXISTS "saved_swaps_user_id_idx" ON "saved_swaps"("user_id");
DO $$ BEGIN
  ALTER TABLE "saved_swaps" ADD CONSTRAINT "saved_swaps_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "saved_swaps" ADD CONSTRAINT "saved_swaps_swap_id_fkey"
    FOREIGN KEY ("swap_id") REFERENCES "swaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"          TEXT NOT NULL,
  "admin_id"    TEXT NOT NULL,
  "action"      TEXT NOT NULL,
  "target_id"   TEXT,
  "target_type" TEXT,
  "detail"      TEXT,
  "ip"          TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "audit_logs_admin_id_idx"    ON "audit_logs"("admin_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx"  ON "audit_logs"("created_at" DESC);
DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "url"        TEXT,
  "read"       BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_idx"       ON "notifications"("user_id", "read");
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add composite index on swaps (depot_id, status, created_at)
CREATE INDEX IF NOT EXISTS "swaps_depot_id_status_created_at_idx" ON "swaps"("depot_id", "status", "created_at" DESC);
