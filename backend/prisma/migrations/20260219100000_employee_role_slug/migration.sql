-- AlterTable: add roleSlug, backfill from Role, then drop roleId and add composite FK
ALTER TABLE "Employee" ADD COLUMN "roleSlug" TEXT;

UPDATE "Employee" e
SET "roleSlug" = r.slug
FROM "Role" r
WHERE r.id = e."roleId";

ALTER TABLE "Employee" ALTER COLUMN "roleSlug" SET NOT NULL;

ALTER TABLE "Employee" DROP CONSTRAINT "Employee_roleId_fkey";
ALTER TABLE "Employee" DROP COLUMN "roleId";

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_roleSlug_fkey" FOREIGN KEY ("companyId", "roleSlug") REFERENCES "Role"("companyId", "slug") ON DELETE CASCADE ON UPDATE CASCADE;
