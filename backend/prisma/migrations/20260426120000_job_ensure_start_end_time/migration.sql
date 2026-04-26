-- Ensure restored start/end columns are populated and non-null.
UPDATE "Job"
SET
  "startTime" = COALESCE("startTime", "date"),
  "endTime" = COALESCE("endTime", "date" + interval '1 hour')
WHERE "startTime" IS NULL OR "endTime" IS NULL;

ALTER TABLE "Job" ALTER COLUMN "startTime" SET NOT NULL;
ALTER TABLE "Job" ALTER COLUMN "endTime" SET NOT NULL;
