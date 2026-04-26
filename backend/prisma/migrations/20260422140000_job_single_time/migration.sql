-- Convert separate start/end time columns into a single scheduled time column.
ALTER TABLE "Job" ADD COLUMN "time" TIMESTAMP(3);

UPDATE "Job"
SET "time" = "startTime"
WHERE "time" IS NULL;

ALTER TABLE "Job" ALTER COLUMN "time" SET NOT NULL;

ALTER TABLE "Job" DROP COLUMN "startTime";
ALTER TABLE "Job" DROP COLUMN "endTime";
