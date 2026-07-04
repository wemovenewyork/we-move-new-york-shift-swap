-- CreateIndex
CREATE INDEX "swaps_user_id_status_idx" ON "swaps"("user_id", "status");

-- CreateIndex
CREATE INDEX "swaps_user_id_created_at_idx" ON "swaps"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_to_user_id_read_idx" ON "messages"("to_user_id", "read");

-- CreateIndex
CREATE INDEX "messages_swap_id_idx" ON "messages"("swap_id");

-- CreateIndex
CREATE INDEX "messages_from_user_id_to_user_id_created_at_idx" ON "messages"("from_user_id", "to_user_id", "created_at" DESC);

