-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'PENDING_REPORT');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "city" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "listedInMarketplace" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "priceRange" INTEGER;

-- CreateTable
CREATE TABLE "Consumer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "consentedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Consumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerTenantLink" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumerTenantLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantCategory" (
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "TenantCategory_pkey" PRIMARY KEY ("tenantId","categoryId")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "reportReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consumer_phone_key" ON "Consumer"("phone");

-- CreateIndex
CREATE INDEX "Consumer_phone_idx" ON "Consumer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerTenantLink_clientId_key" ON "ConsumerTenantLink"("clientId");

-- CreateIndex
CREATE INDEX "ConsumerTenantLink_tenantId_idx" ON "ConsumerTenantLink"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerTenantLink_consumerId_tenantId_key" ON "ConsumerTenantLink"("consumerId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "TenantCategory_categoryId_idx" ON "TenantCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_appointmentId_key" ON "Review"("appointmentId");

-- CreateIndex
CREATE INDEX "Review_tenantId_status_createdAt_idx" ON "Review"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Tenant_listedInMarketplace_city_idx" ON "Tenant"("listedInMarketplace", "city");

-- AddForeignKey
ALTER TABLE "ConsumerTenantLink" ADD CONSTRAINT "ConsumerTenantLink_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerTenantLink" ADD CONSTRAINT "ConsumerTenantLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerTenantLink" ADD CONSTRAINT "ConsumerTenantLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantCategory" ADD CONSTRAINT "TenantCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantCategory" ADD CONSTRAINT "TenantCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
