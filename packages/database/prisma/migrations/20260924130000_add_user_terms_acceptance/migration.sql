-- AlterTable
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMPTZ(6),
ADD COLUMN "termsVersion" TEXT;
