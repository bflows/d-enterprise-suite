/*
  Warnings:

  - The values [IN_PROGRESS] on the enum `JobStatusType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JobStatusType_new" AS ENUM ('SCHEDULED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED', 'INVOICED', 'PAID', 'CANCELLED');
ALTER TABLE "Job" ALTER COLUMN "status" TYPE "JobStatusType_new" USING ("status"::text::"JobStatusType_new");
ALTER TYPE "JobStatusType" RENAME TO "JobStatusType_old";
ALTER TYPE "JobStatusType_new" RENAME TO "JobStatusType";
DROP TYPE "public"."JobStatusType_old";
COMMIT;
