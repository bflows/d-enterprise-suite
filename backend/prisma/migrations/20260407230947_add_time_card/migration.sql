-- CreateTable
CREATE TABLE "TimeCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clockedInAt" TIMESTAMP(3) NOT NULL,
    "clockedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeCard_companyId_userId_idx" ON "TimeCard"("companyId", "userId");

-- CreateIndex
CREATE INDEX "TimeCard_companyId_idx" ON "TimeCard"("companyId");

-- CreateIndex
CREATE INDEX "TimeCard_userId_idx" ON "TimeCard"("userId");

-- AddForeignKey
ALTER TABLE "TimeCard" ADD CONSTRAINT "TimeCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeCard" ADD CONSTRAINT "TimeCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
