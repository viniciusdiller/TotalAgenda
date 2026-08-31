-- M2: cadastro rico de cliente + anamnese (IntakeForm / IntakeResponse).

-- 1. Campos ricos no Client (todos opcionais, sem impacto em dados existentes).
ALTER TABLE "Client"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "birthDate" DATE,
  ADD COLUMN "cpf" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2. Ficha/anamnese.
CREATE TABLE "IntakeForm" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntakeResponse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "IntakeResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntakeForm_tenantId_isActive_idx" ON "IntakeForm"("tenantId", "isActive");
CREATE INDEX "IntakeResponse_tenantId_clientId_idx" ON "IntakeResponse"("tenantId", "clientId");
CREATE INDEX "IntakeResponse_formId_clientId_idx" ON "IntakeResponse"("formId", "clientId");

ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "IntakeForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
