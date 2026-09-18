-- AlterTable
ALTER TABLE "Consumer" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMPTZ(6),
ADD COLUMN     "passwordHash" TEXT;
