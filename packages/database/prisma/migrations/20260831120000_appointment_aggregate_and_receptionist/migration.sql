-- M0: Booking -> agregado Appointment + AppointmentItem; papel RECEPTIONIST.
--
-- Migração com backfill: cada Booking existente vira 1 Appointment + 1 AppointmentItem.
-- A constraint EXCLUDE anti double-booking passa do Booking para o Appointment, agora
-- parcial nos estados que ocupam a agenda (SCHEDULED, CONFIRMED, IN_SERVICE).

-- 1. Novo valor no enum Role. ADD VALUE não pode ser usado na mesma transação em que é
--    criado, mas esta migração não referencia 'RECEPTIONIST' depois, então é seguro.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'RECEPTIONIST' AFTER 'OWNER';

-- 2. Novos enums de agendamento.
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_SERVICE', 'COMPLETED', 'NO_SHOW', 'CANCELED');
CREATE TYPE "AppointmentSource" AS ENUM ('PUBLIC', 'STAFF');

-- 3. Tabelas.
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientId" TEXT,
    "startAt" TIMESTAMPTZ(6) NOT NULL,
    "endAt" TIMESTAMPTZ(6) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "AppointmentSource" NOT NULL DEFAULT 'PUBLIC',
    "notes" TEXT,
    "manageToken" TEXT NOT NULL,
    "canceledAt" TIMESTAMPTZ(6),
    "noShowAt" TIMESTAMPTZ(6),
    "rescheduledCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentItem" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL,
    "priceCentsSnapshot" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentItem_pkey" PRIMARY KEY ("id")
);

-- 4. Backfill a partir de Booking. BookingStatus (CONFIRMED/CANCELED/COMPLETED) é
--    subconjunto de AppointmentStatus, então o cast por texto é seguro.
INSERT INTO "Appointment" (
    "id", "tenantId", "professionalId", "clientName", "clientPhone", "clientId",
    "startAt", "endAt", "status", "source", "notes", "manageToken",
    "canceledAt", "noShowAt", "rescheduledCount", "createdAt", "updatedAt"
)
SELECT
    "id", "tenantId", "professionalId", "clientName", "clientPhone", "clientId",
    "startAt", "endAt", "status"::text::"AppointmentStatus", 'PUBLIC'::"AppointmentSource",
    NULL, "manageToken", "canceledAt", NULL, "rescheduledCount", "createdAt", "updatedAt"
FROM "Booking";

INSERT INTO "AppointmentItem" (
    "id", "appointmentId", "serviceId", "position", "durationMinutes", "priceCentsSnapshot", "createdAt"
)
SELECT
    gen_random_uuid()::text, b."id", b."serviceId", 0,
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (b."endAt" - b."startAt")) / 60.0)::int),
    b."priceCentsSnapshot", b."createdAt"
FROM "Booking" b;

-- 5. Índices.
CREATE UNIQUE INDEX "Appointment_manageToken_key" ON "Appointment"("manageToken");
CREATE INDEX "Appointment_tenantId_startAt_idx" ON "Appointment"("tenantId", "startAt");
CREATE INDEX "Appointment_professionalId_startAt_idx" ON "Appointment"("professionalId", "startAt");
CREATE INDEX "Appointment_clientId_idx" ON "Appointment"("clientId");
CREATE INDEX "AppointmentItem_appointmentId_position_idx" ON "AppointmentItem"("appointmentId", "position");
CREATE INDEX "AppointmentItem_serviceId_idx" ON "AppointmentItem"("serviceId");

-- 6. Foreign keys.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentItem" ADD CONSTRAINT "AppointmentItem_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentItem" ADD CONSTRAINT "AppointmentItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Anti double-booking: mesmo profissional não pode ter dois atendimentos que ocupam a
--    agenda com intervalos sobrepostos. btree_gist já foi criado na migração inicial.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "appointment_no_overlap"
  EXCLUDE USING gist (
    "professionalId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'IN_SERVICE'));

-- 8. Remove o modelo antigo.
DROP TABLE "Booking";
DROP TYPE "BookingStatus";
