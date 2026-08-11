import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { DateTime } from "luxon";
import { BookingStatus, Prisma } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { RescheduleBookingDto } from "./dto/reschedule-booking.dto";
import { AuthenticatedUser } from "../auth/types/auth-user";
import { Role } from "@totalagenda/database";

const MANAGE_TOKEN_LENGTH = 24;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromPublicLink(tenantSlug: string, dto: CreateBookingDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException("Negócio não encontrado.");
    }

    const professionalService = await this.prisma.professionalService.findUnique({
      where: {
        professionalId_serviceId: { professionalId: dto.professionalId, serviceId: dto.serviceId },
      },
      include: { service: true, professional: true },
    });

    if (
      !professionalService ||
      !professionalService.isActive ||
      !professionalService.service.isActive ||
      !professionalService.professional.isActive ||
      professionalService.service.tenantId !== tenant.id ||
      professionalService.professional.tenantId !== tenant.id
    ) {
      throw new NotFoundException("Serviço não disponível para este profissional.");
    }

    const durationMinutes =
      professionalService.durationMinutes ?? professionalService.service.durationMinutes;
    const priceCentsSnapshot =
      professionalService.priceCents ?? professionalService.service.priceCents;

    const startAt = DateTime.fromISO(dto.startAt);
    if (!startAt.isValid) {
      throw new BadRequestException("Data/hora inválida.");
    }
    if (startAt.toMillis() <= Date.now()) {
      throw new BadRequestException("Não é possível agendar em um horário no passado.");
    }
    const endAt = startAt.plus({ minutes: durationMinutes });

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dto.professionalId})::bigint)`;

      await this.assertNoConflict(tx, dto.professionalId, startAt.toJSDate(), endAt.toJSDate());

      return tx.booking.create({
        data: {
          tenantId: tenant.id,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          clientName: dto.clientName,
          clientPhone: dto.clientPhone,
          startAt: startAt.toJSDate(),
          endAt: endAt.toJSDate(),
          priceCentsSnapshot,
          manageToken: nanoid(MANAGE_TOKEN_LENGTH),
        },
        include: {
          service: { select: { name: true } },
          professional: { include: { user: { select: { name: true } } } },
        },
      });
    });
  }

  async findByToken(token: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { manageToken: token },
      include: {
        service: { select: { name: true } },
        professional: { include: { user: { select: { name: true } } } },
        tenant: { select: { slug: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException("Agendamento não encontrado.");
    }
    return booking;
  }

  async cancelByToken(token: string) {
    const booking = await this.findByToken(token);
    if (booking.status === BookingStatus.CANCELED) {
      throw new BadRequestException("Este agendamento já foi cancelado.");
    }

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELED, canceledAt: new Date() },
      include: {
        service: { select: { name: true } },
        professional: { include: { user: { select: { name: true } } } },
        tenant: { select: { slug: true } },
      },
    });
  }

  async rescheduleByToken(token: string, dto: RescheduleBookingDto) {
    const booking = await this.findByToken(token);
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException("Apenas agendamentos confirmados podem ser reagendados.");
    }

    const targetProfessionalId = dto.professionalId ?? booking.professionalId;

    const professionalService = await this.prisma.professionalService.findUnique({
      where: {
        professionalId_serviceId: { professionalId: targetProfessionalId, serviceId: booking.serviceId },
      },
      include: { service: true },
    });
    if (!professionalService || !professionalService.isActive) {
      throw new BadRequestException("Serviço não disponível para o profissional selecionado.");
    }

    const durationMinutes =
      professionalService.durationMinutes ?? professionalService.service.durationMinutes;

    const startAt = DateTime.fromISO(dto.startAt);
    if (!startAt.isValid) {
      throw new BadRequestException("Data/hora inválida.");
    }
    if (startAt.toMillis() <= Date.now()) {
      throw new BadRequestException("Não é possível reagendar para um horário no passado.");
    }
    const endAt = startAt.plus({ minutes: durationMinutes });

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${targetProfessionalId})::bigint)`;

      await this.assertNoConflict(
        tx,
        targetProfessionalId,
        startAt.toJSDate(),
        endAt.toJSDate(),
        booking.id,
      );

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          professionalId: targetProfessionalId,
          startAt: startAt.toJSDate(),
          endAt: endAt.toJSDate(),
          rescheduledCount: { increment: 1 },
        },
        include: {
          service: { select: { name: true } },
          professional: { include: { user: { select: { name: true } } } },
          tenant: { select: { slug: true } },
        },
      });
    });
  }

  async findForAdmin(user: AuthenticatedUser, from?: string, to?: string) {
    const where: Prisma.BookingWhereInput = { tenantId: user.tenantId };

    if (user.role === Role.PROFESSIONAL) {
      where.professionalId = user.professionalId;
    }
    if (from || to) {
      where.startAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        service: { select: { name: true } },
        professional: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startAt: "asc" },
    });
  }

  private async assertNoConflict(
    tx: Prisma.TransactionClient,
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeBookingId?: string,
  ): Promise<void> {
    const [conflictingBooking, conflictingBlock] = await Promise.all([
      tx.booking.findFirst({
        where: {
          professionalId,
          status: BookingStatus.CONFIRMED,
          id: excludeBookingId ? { not: excludeBookingId } : undefined,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      }),
      tx.timeBlock.findFirst({
        where: {
          professionalId,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      }),
    ]);

    if (conflictingBooking || conflictingBlock) {
      throw new ConflictException("Este horário não está mais disponível.");
    }
  }
}
