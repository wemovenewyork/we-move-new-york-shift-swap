-- Constrain message text length at the DB level to match application-level 2000-char limit
ALTER TABLE "messages" ALTER COLUMN "text" TYPE VARCHAR(2000);
