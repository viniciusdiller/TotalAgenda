import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DateTime } from "luxon";
import { PrismaService } from "../prisma/prisma.service";
import { SLOT_BLOCKING_STATUSES } from "../appointments/appointments.service";
import { CreateTimeBlockDto } from "./dto/create-time-block.dto";

// Mesmo fuso fixo usado por AppointmentsService/AvailabilityService.
const TENANT_TIMEZONE = "America/Sao_Paulo";

@Injectable()
export class TimeBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTimeBlockDto) {
    const professional = await this.prisma.professional.findFirst({
      where: { id: dto.professionalId, tenantId },
    });
    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }

    const startAt = DateTime.fromISO(dto.startAt, { zone: TENANT_TIMEZONE });
    const endAt = DateTime.fromISO(dto.endAt, { zone: TENANT_TIMEZONE });
    if (!startAt.isValid || !endAt.isValid) {
      throw new BadRequestException("Data/hora inválida.");
    }
    if (startAt.toMillis() >= endAt.toMillis()) {
      throw new BadRequestException("O início do bloqueio deve ser anterior ao término.");
    }

    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        professionalId: dto.professionalId,
        status: { in: SLOT_BLOCKING_STATUSES },
        startAt: { lt: endAt.toJSDate() },
        endAt: { gt: startAt.toJSDate() },
      },
    });
    if (conflictingAppointment) {
      throw new ConflictException(
        "Já existe um agendamento nesse período. Cancele ou remarque-o antes de bloquear o horário.",
      );
    }

    return this.prisma.timeBlock.create({
      data: {
        tenantId,
        professionalId: dto.professionalId,
        startAt: startAt.toJSDate(),
        endAt: endAt.toJSDate(),
        reason: dto.reason,
      },
    });
  }

  findByProfessional(tenantId: string, professionalId: string) {
    return this.prisma.timeBlock.findMany({
      where: { tenantId, professionalId },
      orderBy: { startAt: "asc" },
    });
  }

  async remove(tenantId: string, id: string) {
    const block = await this.prisma.timeBlock.findFirst({ where: { id, tenantId } });
    if (!block) {
      throw new NotFoundException("Bloqueio não encontrado.");
    }
    await this.prisma.timeBlock.delete({ where: { id } });
  }

  async findOneOrThrow(tenantId: string, id: string) {
    const block = await this.prisma.timeBlock.findFirst({ where: { id, tenantId } });
    if (!block) {
      throw new NotFoundException("Bloqueio não encontrado.");
    }
    return block;
  }
}
