-- Restore `startTime` / `endTime` after experimental single `time` column.
-- Backfill: `time` held the scheduled start instant; end is not recoverable — use +1h as a practical default.

ALTER TABLE "Job" ADD COLUMN "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Job" ADD COLUMN "endTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Job" SET
  "startTime" = "time",
  "endTime" = "time" + interval '1 hour';

ALTER TABLE "Job" ALTER COLUMN "startTime" DROP DEFAULT;
ALTER TABLE "Job" ALTER COLUMN "endTime" DROP DEFAULT;

ALTER TABLE "Job" DROP COLUMN "time";
