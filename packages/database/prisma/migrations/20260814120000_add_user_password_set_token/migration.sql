-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordSetTokenExpiresAt" TIMESTAMPTZ(6),
ADD COLUMN     "passwordSetTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordSetTokenHash_key" ON "User"("passwordSetTokenHash");
