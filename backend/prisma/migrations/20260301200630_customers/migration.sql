/*
  Warnings:

  - You are about to drop the column `homePhone` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `mobilePhone` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `workPhone` on the `Customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "homePhone",
DROP COLUMN "mobilePhone",
DROP COLUMN "workPhone",
ADD COLUMN     "phone" TEXT;
