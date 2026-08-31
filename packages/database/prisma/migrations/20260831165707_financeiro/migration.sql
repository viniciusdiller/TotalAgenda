-- CreateEnum
CREATE TYPE "FinancialDirection" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "FinancialEntrySource" AS ENUM ('TICKET', 'COMMISSION', 'MANUAL');

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "FinancialDirection" NOT NULL,
    "parentId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "FinancialDirection" NOT NULL,
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'PENDING',
    "source" "FinancialEntrySource" NOT NULL DEFAULT 'MANUAL',
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "categoryId" TEXT,
    "counterparty" TEXT,
    "ticketId" TEXT,
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMPTZ(6),
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialCategory_tenantId_direction_isArchived_idx" ON "FinancialCategory"("tenantId", "direction", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_tenantId_name_direction_key" ON "FinancialCategory"("tenantId", "name", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialEntry_ticketId_key" ON "FinancialEntry"("ticketId");

-- CreateIndex
CREATE INDEX "FinancialEntry_tenantId_dueDate_idx" ON "FinancialEntry"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "FinancialEntry_tenantId_status_direction_idx" ON "FinancialEntry"("tenantId", "status", "direction");

-- CreateIndex
CREATE INDEX "FinancialEntry_tenantId_paidAt_idx" ON "FinancialEntry"("tenantId", "paidAt");

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
