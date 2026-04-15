/*
  Warnings:

  - The values [INVOICED,PAID,VOID,UNCOLLECTIBLE,OVERDUE] on the enum `JobStatusType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `fieldProgressStatus` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `Job` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InvoiceStatusType" AS ENUM ('INVOICED', 'PAID', 'VOID', 'UNCOLLECTABLE', 'OVERDUE', 'CANCELLED');

-- Map billing-related job statuses onto field workflow statuses before shrinking the enum.
-- Invoice billing state will live on `Invoice.status` after this migration.
UPDATE "Job" SET "status" = 'COMPLETED'::"JobStatusType"
WHERE "status"::text IN ('INVOICED', 'PAID', 'OVERDUE', 'UNCOLLECTIBLE');

UPDATE "Job" SET "status" = 'CANCELLED'::"JobStatusType"
WHERE "status"::text = 'VOID';

-- Drop before enum swap: `fieldProgressStatus` still referenced the old `JobStatusType`,
-- which blocked `DROP TYPE "JobStatusType_old"` after the rename swap.
ALTER TABLE "Job" DROP COLUMN "fieldProgressStatus";

-- AlterEnum
BEGIN;
CREATE TYPE "JobStatusType_new" AS ENUM ('SCHEDULED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Job" ALTER COLUMN "status" TYPE "JobStatusType_new" USING ("status"::text::"JobStatusType_new");
ALTER TYPE "JobStatusType" RENAME TO "JobStatusType_old";
ALTER TYPE "JobStatusType_new" RENAME TO "JobStatusType";
DROP TYPE "public"."JobStatusType_old";
COMMIT;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "status" "InvoiceStatusType" NOT NULL DEFAULT 'INVOICED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_jobId_key" ON "Invoice"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill invoices from legacy `Job.stripeInvoiceId` before dropping that column.
INSERT INTO "Invoice" ("id", "companyId", "jobId", "stripeInvoiceId", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "companyId", "id", "stripeInvoiceId", 'INVOICED'::"InvoiceStatusType", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Job"
WHERE "stripeInvoiceId" IS NOT NULL;

-- DropIndex
DROP INDEX "Job_stripeInvoiceId_key";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "stripeInvoiceId";
