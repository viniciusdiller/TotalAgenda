import { Injectable, NotFoundException } from "@nestjs/common";
import { WaitlistStatus } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { ClientsService } from "../clients/clients.service";
import { CreateWaitlistEntryDto } from "./dto/create-waitlist-entry.dto";

@Injectable()
export class WaitlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
  ) {}

  async createFromPublicLink(tenantSlug: string, dto: CreateWaitlistEntryDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException("Negócio não encontrado.");
    }

    const client = await this.clientsService.upsertForBooking(
      this.prisma,
      tenant.id,
      dto.clientName,
      dto.clientPhone,
    );

    return this.prisma.waitlistEntry.create({
      data: {
        tenantId: tenant.id,
        serviceId: dto.serviceId,
        professionalId: dto.professionalId,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        clientId: client.id,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  findAllByTenant(tenantId: string, status?: WaitlistStatus) {
    return this.prisma.waitlistEntry.findMany({
      where: { tenantId, status },
      include: { service: { select: { name: true } }, professional: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateStatus(tenantId: string, id: string, status: WaitlistStatus) {
    const entry = await this.prisma.waitlistEntry.findFirst({ where: { id, tenantId } });
    if (!entry) {
      throw new NotFoundException("Registro da lista de espera não encontrado.");
    }
    return this.prisma.waitlistEntry.update({ where: { id }, data: { status } });
  }
}
