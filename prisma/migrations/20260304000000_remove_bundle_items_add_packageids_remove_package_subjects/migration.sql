-- Manual migration (Prisma shadow DB creation fails in this environment).
-- Changes:
-- 1) Remove Package.subjects
-- 2) Remove PackageBundleItem join table
-- 3) Add PackageBundle.packageIds (array of package IDs) and backfill from join table

-- 1) Add new column to bundles
ALTER TABLE "package_bundles"
ADD COLUMN IF NOT EXISTS "packageIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2) Backfill from the join table (preserve display order)
UPDATE "package_bundles" b
SET "packageIds" = COALESCE(x.package_ids, ARRAY[]::TEXT[])
FROM (
  SELECT
    "bundleId" AS bundle_id,
    array_agg("packageId" ORDER BY "displayOrder" ASC, "createdAt" ASC) AS package_ids
  FROM "package_bundle_items"
  GROUP BY "bundleId"
) x
WHERE b."id" = x.bundle_id;

-- 3) Drop the join table
DROP TABLE IF EXISTS "package_bundle_items";

-- 4) Drop subjects from packages
ALTER TABLE "packages"
DROP COLUMN IF EXISTS "subjects";

