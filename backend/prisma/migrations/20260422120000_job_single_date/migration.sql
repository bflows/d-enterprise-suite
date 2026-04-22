-- DropIndex
DROP INDEX IF EXISTS "Job_startDate_idx";

-- AlterTable: single calendar date (backfill from former startDate)
ALTER TABLE "Job" ADD COLUMN "date" TIMESTAMP(3);
UPDATE "Job" SET "date" = "startDate" WHERE "date" IS NULL;
ALTER TABLE "Job" ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "Job" DROP COLUMN "startDate";
ALTER TABLE "Job" DROP COLUMN "endDate";

-- CreateIndex
CREATE INDEX "Job_date_idx" ON "Job"("date");
