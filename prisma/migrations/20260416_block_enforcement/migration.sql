-- Create blocks table for H3 block enforcement
CREATE TABLE "blocks" (
  "id"         TEXT        NOT NULL,
  "blocker_id" TEXT        NOT NULL,
  "blocked_id" TEXT        NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id"),
  CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "blocks_blocked_id_fkey"  FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");
