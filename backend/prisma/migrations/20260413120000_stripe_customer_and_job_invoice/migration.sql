-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "stripeInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_stripeCustomerId_key" ON "Customer"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_stripeInvoiceId_key" ON "Job"("stripeInvoiceId");
