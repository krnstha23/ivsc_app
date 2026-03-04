-- Rename username to userName for camelCase consistency with other columns
DROP INDEX IF EXISTS "users_username_key";
ALTER TABLE "users" RENAME COLUMN "username" TO "userName";
CREATE UNIQUE INDEX "users_userName_key" ON "users"("userName");
