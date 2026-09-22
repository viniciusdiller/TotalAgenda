-- Sessão deslizante por dispositivo do Consumer (login "nunca sai" enquanto ativo,
-- revogável por dispositivo). Ver ConsumerAuthService/ConsumerJwtAuthGuard.
CREATE TABLE "ConsumerSession" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "ConsumerSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsumerSession_consumerId_idx" ON "ConsumerSession"("consumerId");

ALTER TABLE "ConsumerSession" ADD CONSTRAINT "ConsumerSession_consumerId_fkey"
    FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
