/*
  Warnings:

  - You are about to drop the column `slug` on the `Company` table. All the data in the column will be lost.
  - Added the required column `industry` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Company_slug_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "slug",
ADD COLUMN     "industry" TEXT NOT NULL;
