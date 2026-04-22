-- One-off: align a database that was migrated with "ghost" migrations
-- (recorded in _prisma_migrations but missing from this repo) to schema.prisma:
--   _EmployeeToJob (implicit M2M) -> Job.technicianId (first linked employee, stable)
--   Reminder columns removed to match current schema
--
-- Safe to run on a DB that already matches schema: early-exits.
BEGIN;

-- Remove history rows for migration files that do not exist in the repo
DELETE FROM "_prisma_migrations"
WHERE "migration_name" IN (
  '20260416221238_job_reminder_24h_sent_at',
  '20260416221503_job_reminder_lead_eligible',
  '20260416221530_backfill_reminder_lead_eligible',
  '20260418120000_job_multiple_technicians'
);

-- Reminder index + columns (only if they exist, from the ghost path)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Job_status_reminderLeadEligible_reminder24hSentAt_startTime_idx'
  ) THEN
    DROP INDEX "Job_status_reminderLeadEligible_reminder24hSentAt_startTime_idx";
  END IF;
END $$;

-- Reconcile join table + technicianId
DO $$
BEGIN
  -- `to_regclass('public._EmployeeToJob')` is unreliable for this mixed-case table; use catalog lookup.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = '_EmployeeToJob'
      AND c.relkind = 'r'
  ) THEN
    -- Already in single-technician shape: only strip leftover reminder columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'reminder24hSentAt'
    ) THEN
      ALTER TABLE "Job" DROP COLUMN "reminder24hSentAt";
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'reminderLeadEligible'
    ) THEN
      ALTER TABLE "Job" DROP COLUMN "reminderLeadEligible";
    END IF;
  ELSE
  -- Add technicianId, backfill from M2M (A=Employee, B=Job in Prisma implicit order)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'technicianId'
  ) THEN
    ALTER TABLE "Job" ADD COLUMN "technicianId" TEXT;
  END IF;

  UPDATE "Job" j
  SET "technicianId" = s.tech_id
  FROM (
    SELECT DISTINCT ON (ej."B") ej."B" AS job_id, ej."A" AS tech_id
    FROM "_EmployeeToJob" ej
    ORDER BY ej."B", ej."A" ASC
  ) s
  WHERE j.id = s.job_id
    AND (j."technicianId" IS NULL OR j."technicianId" = '');

  -- Any job with no link: pick a stable employee in the same company
  UPDATE "Job" j
  SET "technicianId" = e.id
  FROM (
    SELECT DISTINCT ON (e0."companyId") e0."companyId" AS cid, e0.id
    FROM "Employee" e0
    ORDER BY e0."companyId", e0.id ASC
  ) e
  WHERE j."companyId" = e.cid
    AND (j."technicianId" IS NULL OR j."technicianId" = '');

  IF EXISTS (
    SELECT 1 FROM "Job" WHERE "technicianId" IS NULL OR "technicianId" = ''
  ) THEN
    RAISE EXCEPTION 'reconcile: could not set technicianId for all jobs (missing Employee rows?)';
  END IF;

  ALTER TABLE "Job" ALTER COLUMN "technicianId" SET NOT NULL;

  ALTER TABLE "_EmployeeToJob" DROP CONSTRAINT IF EXISTS "_EmployeeToJob_A_fkey";
  ALTER TABLE "_EmployeeToJob" DROP CONSTRAINT IF EXISTS "_EmployeeToJob_B_fkey";
  DROP TABLE "_EmployeeToJob";

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'reminder24hSentAt'
  ) THEN
    ALTER TABLE "Job" DROP COLUMN "reminder24hSentAt";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'reminderLeadEligible'
  ) THEN
    ALTER TABLE "Job" DROP COLUMN "reminderLeadEligible";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Job_technicianId_idx'
  ) THEN
    CREATE INDEX "Job_technicianId_idx" ON "Job"("technicianId");
  END IF;

  -- Match schema: ON DELETE restrict (from migrate diff; DB may have been RESTRICT or NO ACTION)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Job_technicianId_fkey'
  ) THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey"
      FOREIGN KEY ("technicianId") REFERENCES "Employee"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  END IF;
END $$;

COMMIT;
