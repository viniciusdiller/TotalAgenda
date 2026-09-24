-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StripeEvent_processedAt_idx" ON "StripeEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");
