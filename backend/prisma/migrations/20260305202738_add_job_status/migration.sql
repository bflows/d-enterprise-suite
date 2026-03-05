/*
  Warnings:

  - Added the required column `status` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JobStatusType" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "status" "JobStatusType" NOT NULL DEFAULT 'SCHEDULED';
