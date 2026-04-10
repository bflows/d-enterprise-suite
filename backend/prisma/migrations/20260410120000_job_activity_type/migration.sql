-- CreateEnum
CREATE TYPE "JobActivityType" AS ENUM (
    'JOB_CREATED',
    'JOB_UPDATED',
    'JOB_STATUS_UPDATED',
    'JOB_NOTE_UPDATED',
    'JOB_ATTACHMENT_ADDED'
);

-- AlterTable
ALTER TABLE "JobActivity"
ADD COLUMN "type" "JobActivityType" NOT NULL DEFAULT 'JOB_CREATED';
