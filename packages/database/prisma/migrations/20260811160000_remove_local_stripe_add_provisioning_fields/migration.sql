-- A cobrança real (checkout, portal, ciclo do Stripe) passa a viver no Admin-TotalSoftware.
-- Este backend passa a receber tenants via webhook de provisionamento (identificado por
-- Tenant.externalCustomerId) e status de assinatura via webhook de sincronização, que nem
-- sempre informa a próxima cobrança — por isso currentPeriodEnd vira opcional.

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "externalCustomerId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_externalCustomerId_key" ON "Tenant"("externalCustomerId");

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "currentPeriodEnd" DROP NOT NULL;
