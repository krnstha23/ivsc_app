-- Add username column (nullable first for backfill)
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill existing rows: use email as username so existing users can still log in
UPDATE "users" SET "username" = "email" WHERE "username" IS NULL;

-- Make username required and unique
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
