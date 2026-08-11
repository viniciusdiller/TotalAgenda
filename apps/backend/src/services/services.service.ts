import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { LinkProfessionalServiceDto } from "./dto/link-professional-service.dto";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({ data: { tenantId, ...dto } });
  }

  findAllByTenant(tenantId: string) {
    return this.prisma.service.findMany({ where: { tenantId } });
  }

  async findOneOrThrow(tenantId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({ where: { id: serviceId, tenantId } });
    if (!service) {
      throw new NotFoundException("Serviço não encontrado.");
    }
    return service;
  }

  async update(tenantId: string, serviceId: string, dto: UpdateServiceDto) {
    await this.findOneOrThrow(tenantId, serviceId);
    return this.prisma.service.update({ where: { id: serviceId }, data: dto });
  }

  async linkToProfessional(
    tenantId: string,
    professionalId: string,
    dto: LinkProfessionalServiceDto,
  ) {
    const professional = await this.prisma.professional.findFirst({
      where: { id: professionalId, tenantId },
    });
    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }
    await this.findOneOrThrow(tenantId, dto.serviceId);

    return this.prisma.professionalService.upsert({
      where: { professionalId_serviceId: { professionalId, serviceId: dto.serviceId } },
      update: {
        durationMinutes: dto.durationMinutes,
        priceCents: dto.priceCents,
        isActive: dto.isActive ?? true,
      },
      create: {
        professionalId,
        serviceId: dto.serviceId,
        durationMinutes: dto.durationMinutes,
        priceCents: dto.priceCents,
        isActive: dto.isActive ?? true,
      },
    });
  }

  listByProfessional(tenantId: string, professionalId: string) {
    return this.prisma.professionalService.findMany({
      where: { professionalId, professional: { tenantId } },
      include: { service: true },
    });
  }

  async findPublicByTenantSlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!tenant) {
      throw new NotFoundException("Negócio não encontrado.");
    }
    return this.prisma.service.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, description: true, durationMinutes: true, priceCents: true },
    });
  }
}
