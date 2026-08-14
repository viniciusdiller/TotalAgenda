-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "showContact" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showGallery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showServices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showTeam" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "whatsappNumber" TEXT;

-- CreateTable
CREATE TABLE "TenantGalleryImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantGalleryImage_tenantId_position_idx" ON "TenantGalleryImage"("tenantId", "position");

-- AddForeignKey
ALTER TABLE "TenantGalleryImage" ADD CONSTRAINT "TenantGalleryImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
