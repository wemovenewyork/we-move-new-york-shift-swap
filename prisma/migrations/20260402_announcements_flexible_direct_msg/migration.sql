-- AlterTable: add flexibleMode and flexibleSince to users
ALTER TABLE "users"
  ADD COLUMN "flexible_mode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "flexible_since" TIMESTAMP(3);

-- AlterTable: make swap_id nullable on messages (direct messages)
ALTER TABLE "messages"
  ALTER COLUMN "swap_id" DROP NOT NULL;

-- CreateTable: announcements
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "depot_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" VARCHAR(600) NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_depot_id_fkey"
  FOREIGN KEY ("depot_id") REFERENCES "depots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
