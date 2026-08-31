import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { isPlausibleBrazilianPhone, normalizePhone } from "../common/utils/phone.util";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // Cadastro rico / painel (M2)
  // ─────────────────────────────────────────────

  async list(tenantId: string, search?: string) {
    const where: Prisma.ClientWhereInput = { tenantId };
    if (search?.trim()) {
      const term = search.trim();
      const digits = term.replace(/\D/g, "");
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        ...(digits ? [{ phone: { contains: digits } as Prisma.StringFilter }] : []),
      ];
    }
    return this.prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      take: 200,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        tags: true,
        createdAt: true,
        _count: { select: { appointments: true } },
      },
    });
  }

  async getDetail(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        appointments: {
          orderBy: { startAt: "desc" },
          take: 100,
          include: {
            items: { include: { service: { select: { name: true } } }, orderBy: { position: "asc" } },
            professional: { include: { user: { select: { name: true } } } },
          },
        },
        intakeResponses: {
          orderBy: { updatedAt: "desc" },
          include: { form: { select: { id: true, name: true, fields: true } } },
        },
      },
    });
    if (!client) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    // Só a resposta mais recente por formulário (a lista já vem ordenada desc).
    const latestByForm = new Map<string, (typeof client.intakeResponses)[number]>();
    for (const response of client.intakeResponses) {
      if (!latestByForm.has(response.formId)) latestByForm.set(response.formId, response);
    }

    return { ...client, intakeResponses: [...latestByForm.values()] };
  }

  async create(tenantId: string, dto: CreateClientDto) {
    const phone = normalizePhone(dto.phone);
    if (!isPlausibleBrazilianPhone(phone)) {
      throw new BadRequestException("Telefone inválido.");
    }
    const existing = await this.prisma.client.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("Já existe um cliente com este telefone.");
    }
    return this.prisma.client.create({
      data: { ...this.sanitize(dto), tenantId, phone, name: dto.name.trim() },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!client) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    let phone: string | undefined;
    if (dto.phone !== undefined) {
      phone = normalizePhone(dto.phone);
      if (!isPlausibleBrazilianPhone(phone)) {
        throw new BadRequestException("Telefone inválido.");
      }
      const clash = await this.prisma.client.findUnique({
        where: { tenantId_phone: { tenantId, phone } },
        select: { id: true },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException("Já existe um cliente com este telefone.");
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...this.sanitize(dto),
        ...(phone ? { phone } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      },
    });
  }

  // Normaliza campos opcionais: string vazia vira null, CPF só dígitos, tags sem espaços.
  private sanitize(dto: CreateClientDto | UpdateClientDto) {
    const clean = (value?: string | null) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };
    return {
      email: dto.email !== undefined ? clean(dto.email) : undefined,
      cpf: dto.cpf !== undefined ? (dto.cpf ? dto.cpf.replace(/\D/g, "") : null) : undefined,
      notes: dto.notes !== undefined ? clean(dto.notes) : undefined,
      birthDate:
        dto.birthDate !== undefined ? (dto.birthDate ? new Date(dto.birthDate) : null) : undefined,
      tags:
        dto.tags !== undefined
          ? [...new Set(dto.tags.map((t) => t.trim()).filter(Boolean))]
          : undefined,
    };
  }

  // Aceita tanto o PrismaService quanto um Prisma.TransactionClient para que quem chama
  // (bookings/waitlist) possa fazer o upsert dentro da mesma transaction do agendamento.
  async upsertForBooking(
    tx: Prisma.TransactionClient | PrismaService,
    tenantId: string,
    name: string,
    rawPhone: string,
  ) {
    const phone = normalizePhone(rawPhone);
    if (!isPlausibleBrazilianPhone(phone)) {
      throw new BadRequestException("Telefone inválido.");
    }

    return tx.client.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      update: { name: name.trim() },
      create: { tenantId, phone, name: name.trim() },
    });
  }

  findByTenantAndPhone(tenantId: string, rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    return this.prisma.client.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
    });
  }
}
