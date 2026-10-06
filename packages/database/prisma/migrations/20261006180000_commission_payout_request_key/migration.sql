-- AlterTable
ALTER TABLE "CommissionPayout" ADD COLUMN "requestKey" TEXT;

-- CreateIndex (NULLs não colidem no Postgres: repasses sem chave seguem permitidos)
CREATE UNIQUE INDEX "CommissionPayout_tenantId_requestKey_key" ON "CommissionPayout"("tenantId", "requestKey");
