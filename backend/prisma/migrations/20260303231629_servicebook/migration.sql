-- CreateEnum
CREATE TYPE "ServiceItemType" AS ENUM ('SERVICE', 'ADDON');

-- CreateTable
CREATE TABLE "ServiceBook" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBookCategory" (
    "id" TEXT NOT NULL,
    "serviceBookId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBookCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "ServiceItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceBook_companyId_idx" ON "ServiceBook"("companyId");

-- CreateIndex
CREATE INDEX "ServiceBookCategory_serviceBookId_idx" ON "ServiceBookCategory"("serviceBookId");

-- CreateIndex
CREATE INDEX "ServiceItem_categoryId_idx" ON "ServiceItem"("categoryId");

-- AddForeignKey
ALTER TABLE "ServiceBook" ADD CONSTRAINT "ServiceBook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBookCategory" ADD CONSTRAINT "ServiceBookCategory_serviceBookId_fkey" FOREIGN KEY ("serviceBookId") REFERENCES "ServiceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceBookCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
