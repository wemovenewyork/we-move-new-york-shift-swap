-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notification_prefs" JSONB,
ADD COLUMN     "quiet_end" TEXT,
ADD COLUMN     "quiet_start" TEXT;
