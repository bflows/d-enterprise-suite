-- AlterTable
ALTER TABLE "Job" ADD COLUMN "reminder24hSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Job_status_reminder24hSentAt_startTime_idx" ON "Job"("status", "reminder24hSentAt", "startTime");
