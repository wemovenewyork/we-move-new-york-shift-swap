-- Add dispatcher to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'dispatcher';

-- Add open_work to SwapCategory enum
ALTER TYPE "SwapCategory" ADD VALUE IF NOT EXISTS 'open_work';

-- Add dispatcher_verified and dispatcher_badge to users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "dispatcher_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dispatcher_badge" TEXT;
