import { join } from "path";
import { mkdir, rm } from "fs/promises";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import sharp from "sharp";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateTenantProfileDto } from "./dto/update-tenant-profile.dto";
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from "../common/constants/uploads";

const ALLOWED_LOGO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const LOGO_MAX_DIMENSION = 800;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  findById(tenantId: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  }

  async findPublicBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        address: true,
        businessHours: true,
        logoUrl: true,
        accentColor: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException("Negócio não encontrado.");
    }

    return tenant;
  }

  updateProfile(tenantId: string, dto: UpdateTenantProfileDto) {
    return this.prisma.tenant.update({ where: { id: tenantId }, data: dto });
  }

  async updateLogo(tenantId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Nenhum arquivo enviado.");
    }
    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Formato de imagem não suportado. Use JPEG, PNG ou WEBP.");
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      throw new BadRequestException("Imagem muito grande (máximo 5MB).");
    }

    const tenantDir = join(UPLOADS_DIR, "tenants", tenantId);
    await mkdir(tenantDir, { recursive: true });

    // Nome fixo por tenant: reupload sobrescreve o arquivo anterior, sem lixo acumulando.
    const filePath = join(tenantDir, "logo.webp");
    try {
      await sharp(file.buffer)
        .resize(LOGO_MAX_DIMENSION, LOGO_MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toFile(filePath);
    } catch {
      throw new BadRequestException("Não foi possível processar a imagem enviada.");
    }

    const logoUrl = `${UPLOADS_URL_PREFIX}/tenants/${tenantId}/logo.webp`;
    return this.prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl } });
  }

  async removeLogo(tenantId: string) {
    const tenantDir = join(UPLOADS_DIR, "tenants", tenantId);
    await rm(tenantDir, { recursive: true, force: true });
    return this.prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl: null } });
  }
}
