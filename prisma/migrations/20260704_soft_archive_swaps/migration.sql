-- AlterTable
ALTER TABLE "swaps" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "swaps_archived_at_idx" ON "swaps"("archived_at");
