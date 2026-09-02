import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { nanoid } from "nanoid";
import { DateTime } from "luxon";
import { AppointmentStatus, Prisma, Role } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { CreateStaffAppointmentDto } from "./dto/create-staff-appointment.dto";
import { RescheduleAppointmentDto } from "./dto/reschedule-appointment.dto";
import { UpdateAppointmentStatusDto } from "./dto/update-appointment-status.dto";
import { AuthenticatedUser } from "../auth/types/auth-user";
import { ClientsService } from "../clients/clients.service";
import { AuthenticatedClient } from "../client-auth/types/client-auth-user";

const MANAGE_TOKEN_LENGTH = 24;

// Estados que ocupam a agenda — batem com o WHERE parcial da constraint EXCLUDE.
const SLOT_BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_SERVICE,
];

// Transições de status permitidas pela recepção. CANCELED sai por endpoint próprio.
const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: [AppointmentStatus.CONFIRMED, AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELED],
  CONFIRMED: [
    AppointmentStatus.IN_SERVICE,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELED,
  ],
  IN_SERVICE: [AppointmentStatus.COMPLETED, AppointmentStatus.CONFIRMED],
  COMPLETED: [],
  NO_SHOW: [AppointmentStatus.CONFIRMED],
  CANCELED: [],
};

const APPOINTMENT_INCLUDE = {
  items: {
    orderBy: { position: "asc" },
    include: { service: { select: { id: true, name: true } } },
  },
  professional: { include: { user: { select: { name: true } } } },
  tenant: { select: { slug: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{ include: typeof APPOINTMENT_INCLUDE }>;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
  ) {}

  // ─────────────────────────────────────────────
  // Criação
  // ─────────────────────────────────────────────

  async createFromPublicLink(tenantSlug: string, dto: CreateAppointmentDto) {
    const tenant = await this.getTenantBySlug(tenantSlug);

    const resolved = await this.resolveServiceForProfessional(
      tenant.id,
      dto.professionalId,
      dto.serviceId,
    );

    const startAt = this.parseFutureDate(dto.startAt, "Não é possível agendar em um horário no passado.");
    const endAt = startAt.plus({ minutes: resolved.durationMinutes });

    return this.prisma.$transaction(async (tx) => {
      await this.lockProfessional(tx, dto.professionalId);
      await this.assertNoConflict(tx, dto.professionalId, startAt.toJSDate(), endAt.toJSDate());

      const client = await this.clientsService.upsertForBooking(
        tx,
        tenant.id,
        dto.clientName,
        dto.clientPhone,
      );

      const created = await tx.appointment.create({
        data: {
          tenantId: tenant.id,
          professionalId: dto.professionalId,
          clientName: dto.clientName,
          clientPhone: dto.clientPhone,
          clientId: client.id,
          startAt: startAt.toJSDate(),
          endAt: endAt.toJSDate(),
          status: AppointmentStatus.CONFIRMED,
          source: "PUBLIC",
          manageToken: nanoid(MANAGE_TOKEN_LENGTH),
          items: {
            create: {
              serviceId: dto.serviceId,
              position: 0,
              durationMinutes: resolved.durationMinutes,
              priceCentsSnapshot: resolved.priceCents,
            },
          },
        },
        include: APPOINTMENT_INCLUDE,
      });
      return this.serialize(created);
    });
  }

  async createByStaff(user: AuthenticatedUser, dto: CreateStaffAppointmentDto) {
    if (user.role === Role.PROFESSIONAL && user.professionalId !== dto.professionalId) {
      throw new ForbiddenException("Você só pode criar atendimentos para a sua própria agenda.");
    }

    const professional = await this.prisma.professional.findFirst({
      where: { id: dto.professionalId, tenantId: user.tenantId, isActive: true },
      select: { id: true },
    });
    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }

    const resolvedItems = await Promise.all(
      dto.items.map((item) =>
        this.resolveServiceForProfessional(user.tenantId, dto.professionalId, item.serviceId),
      ),
    );
    const totalDuration = resolvedItems.reduce((sum, item) => sum + item.durationMinutes, 0);

    const startAt = this.parseFutureDate(
      dto.startAt,
      "Não é possível agendar em um horário no passado.",
    );
    const endAt = startAt.plus({ minutes: totalDuration });

    const { clientName, clientPhone, clientId } = await this.resolveStaffClient(user.tenantId, dto);

    return this.prisma.$transaction(async (tx) => {
      await this.lockProfessional(tx, dto.professionalId);
      await this.assertNoConflict(tx, dto.professionalId, startAt.toJSDate(), endAt.toJSDate());

      const created = await tx.appointment.create({
        data: {
          tenantId: user.tenantId,
          professionalId: dto.professionalId,
          clientName,
          clientPhone,
          clientId,
          startAt: startAt.toJSDate(),
          endAt: endAt.toJSDate(),
          status:
            dto.status === "CONFIRMED"
              ? AppointmentStatus.CONFIRMED
              : AppointmentStatus.SCHEDULED,
          source: "STAFF",
          notes: dto.notes,
          manageToken: nanoid(MANAGE_TOKEN_LENGTH),
          items: {
            create: resolvedItems.map((item, position) => ({
              serviceId: item.serviceId,
              position,
              durationMinutes: item.durationMinutes,
              priceCentsSnapshot: item.priceCents,
            })),
          },
        },
        include: APPOINTMENT_INCLUDE,
      });
      return this.serialize(created);
    });
  }

  // ─────────────────────────────────────────────
  // Leitura
  // ─────────────────────────────────────────────

  async findByToken(token: string) {
    return this.serialize(await this.getByTokenOrThrow(token));
  }

  async findForAdmin(user: AuthenticatedUser, from?: string, to?: string) {
    const where: Prisma.AppointmentWhereInput = { tenantId: user.tenantId };

    // RECEPTIONIST e OWNER veem a agenda inteira; PROFESSIONAL só a própria.
    if (user.role === Role.PROFESSIONAL) {
      where.professionalId = user.professionalId;
    }
    if (from || to) {
      where.startAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
      orderBy: { startAt: "asc" },
    });
    return appointments.map((appointment) => this.serialize(appointment));
  }

  // Payload único da tela de agenda: colunas de profissional (com horário de trabalho),
  // atendimentos e bloqueios no intervalo. Reaproveita as mesmas regras de visibilidade
  // por role de findForAdmin.
  async getCalendar(user: AuthenticatedUser, from: string, to: string, professionalId?: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Intervalo de datas inválido.");
    }
    if (toDate.getTime() - fromDate.getTime() > 45 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException("Intervalo máximo da agenda é de 45 dias.");
    }

    const scopedProfessionalId =
      user.role === Role.PROFESSIONAL ? user.professionalId : professionalId;

    const professionalWhere: Prisma.ProfessionalWhereInput = {
      tenantId: user.tenantId,
      isActive: true,
      ...(scopedProfessionalId ? { id: scopedProfessionalId } : {}),
    };
    const overlapWhere = { startAt: { lt: toDate }, endAt: { gt: fromDate } };

    const [professionals, appointments, timeBlocks] = await Promise.all([
      this.prisma.professional.findMany({
        where: professionalWhere,
        select: {
          id: true,
          slotGranularityMinutes: true,
          user: { select: { name: true } },
          workingHours: {
            select: { weekday: true, startMinute: true, endMinute: true },
            orderBy: { startMinute: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.appointment.findMany({
        where: {
          tenantId: user.tenantId,
          ...(scopedProfessionalId ? { professionalId: scopedProfessionalId } : {}),
          ...overlapWhere,
        },
        include: APPOINTMENT_INCLUDE,
        orderBy: { startAt: "asc" },
      }),
      this.prisma.timeBlock.findMany({
        where: {
          tenantId: user.tenantId,
          ...(scopedProfessionalId ? { professionalId: scopedProfessionalId } : {}),
          ...overlapWhere,
        },
        select: { id: true, professionalId: true, startAt: true, endAt: true, reason: true },
      }),
    ]);

    return {
      professionals: professionals.map((professional) => ({
        id: professional.id,
        name: professional.user.name,
        slotGranularityMinutes: professional.slotGranularityMinutes,
        workingHours: professional.workingHours,
      })),
      appointments: appointments.map((appointment) => this.serialize(appointment)),
      timeBlocks,
    };
  }

  // ─────────────────────────────────────────────
  // Ações por token (link enviado ao cliente)
  // ─────────────────────────────────────────────

  async cancelByToken(token: string) {
    return this.applyCancel(await this.getByTokenOrThrow(token));
  }

  async rescheduleByToken(token: string, dto: RescheduleAppointmentDto) {
    return this.applyReschedule(await this.getByTokenOrThrow(token), dto);
  }

  // ─────────────────────────────────────────────
  // Ações da recepção/dono
  // ─────────────────────────────────────────────

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateAppointmentStatusDto) {
    const appointment = await this.findOwnedByStaff(user, id);
    const target = dto.status as AppointmentStatus;

    if (!STATUS_TRANSITIONS[appointment.status].includes(target)) {
      throw new BadRequestException(
        `Transição de status inválida (${appointment.status} → ${target}).`,
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: target,
        noShowAt: target === AppointmentStatus.NO_SHOW ? new Date() : appointment.noShowAt,
      },
      include: APPOINTMENT_INCLUDE,
    });
    return this.serialize(updated);
  }

  async cancelByStaff(user: AuthenticatedUser, id: string) {
    return this.applyCancel(await this.findOwnedByStaff(user, id));
  }

  async rescheduleByStaff(user: AuthenticatedUser, id: string, dto: RescheduleAppointmentDto) {
    // Mesma regra do createByStaff: PROFESSIONAL não pode mover um atendimento pra agenda de
    // outro profissional (findOwnedByStaff já garante que só mexe nos próprios atendimentos;
    // falta garantir que o destino da remarcação também seja a própria agenda).
    if (
      user.role === Role.PROFESSIONAL &&
      dto.professionalId &&
      dto.professionalId !== user.professionalId
    ) {
      throw new ForbiddenException("Você só pode remarcar para a sua própria agenda.");
    }
    return this.applyReschedule(await this.findOwnedByStaff(user, id), dto);
  }

  // ─────────────────────────────────────────────
  // Área do cliente logado (my-bookings) — mesma lógica de cancel/reschedule, muda só como
  // o atendimento é localizado: por dono (clientId), sempre na cláusula WHERE (sem janela
  // de IDOR).
  // ─────────────────────────────────────────────

  async findForClient(slug: string, client: AuthenticatedClient) {
    const tenant = await this.assertClientTenant(slug, client);
    const appointments = await this.prisma.appointment.findMany({
      where: { clientId: client.clientId, tenantId: tenant.id },
      include: APPOINTMENT_INCLUDE,
      orderBy: { startAt: "desc" },
    });
    return appointments.map((appointment) => this.serialize(appointment));
  }

  async cancelForClient(slug: string, appointmentId: string, client: AuthenticatedClient) {
    return this.applyCancel(await this.findOwnedByClient(slug, appointmentId, client));
  }

  async rescheduleForClient(
    slug: string,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
    client: AuthenticatedClient,
  ) {
    return this.applyReschedule(await this.findOwnedByClient(slug, appointmentId, client), dto);
  }

  // ─────────────────────────────────────────────
  // Internos
  // ─────────────────────────────────────────────

  private async getTenantBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!tenant) {
      throw new NotFoundException("Negócio não encontrado.");
    }
    return tenant;
  }

  private async getByTokenOrThrow(token: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { manageToken: token },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      throw new NotFoundException("Agendamento não encontrado.");
    }
    return appointment;
  }

  private async findOwnedByStaff(user: AuthenticatedUser, id: string) {
    const where: Prisma.AppointmentWhereInput = { id, tenantId: user.tenantId };
    if (user.role === Role.PROFESSIONAL) {
      where.professionalId = user.professionalId;
    }
    const appointment = await this.prisma.appointment.findFirst({
      where,
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      throw new NotFoundException("Agendamento não encontrado.");
    }
    return appointment;
  }

  private async findOwnedByClient(slug: string, id: string, client: AuthenticatedClient) {
    const tenant = await this.assertClientTenant(slug, client);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId: tenant.id, clientId: client.clientId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      throw new NotFoundException("Agendamento não encontrado.");
    }
    return appointment;
  }

  private async assertClientTenant(slug: string, client: AuthenticatedClient) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!tenant || tenant.id !== client.tenantId) {
      throw new ForbiddenException();
    }
    return tenant;
  }

  private async resolveStaffClient(tenantId: string, dto: CreateStaffAppointmentDto) {
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
      });
      if (!client) {
        throw new NotFoundException("Cliente não encontrado.");
      }
      return { clientName: client.name, clientPhone: client.phone, clientId: client.id };
    }

    if (!dto.clientName || !dto.clientPhone) {
      throw new BadRequestException(
        "Informe um cliente existente (clientId) ou nome e telefone para cadastro rápido.",
      );
    }

    const client = await this.clientsService.upsertForBooking(
      this.prisma,
      tenantId,
      dto.clientName,
      dto.clientPhone,
    );
    return { clientName: dto.clientName, clientPhone: dto.clientPhone, clientId: client.id };
  }

  private async resolveServiceForProfessional(
    tenantId: string,
    professionalId: string,
    serviceId: string,
  ) {
    // findFirst com o tenantId de serviço e profissional na própria cláusula WHERE (não
    // findUnique + checagem em JS depois) — evita a janela de IDOR que a checagem posterior
    // abriria.
    const professionalService = await this.prisma.professionalService.findFirst({
      where: {
        professionalId,
        serviceId,
        isActive: true,
        service: { tenantId, isActive: true },
        professional: { tenantId, isActive: true },
      },
      include: { service: true, professional: true },
    });

    if (!professionalService) {
      throw new NotFoundException("Serviço não disponível para este profissional.");
    }

    return {
      serviceId,
      durationMinutes:
        professionalService.durationMinutes ?? professionalService.service.durationMinutes,
      priceCents: professionalService.priceCents ?? professionalService.service.priceCents,
    };
  }

  private parseFutureDate(raw: string, pastMessage: string) {
    const parsed = DateTime.fromISO(raw);
    if (!parsed.isValid) {
      throw new BadRequestException("Data/hora inválida.");
    }
    if (parsed.toMillis() <= Date.now()) {
      throw new BadRequestException(pastMessage);
    }
    return parsed;
  }

  private async lockProfessional(tx: Prisma.TransactionClient, professionalId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${professionalId})::bigint)`;
  }

  private async applyCancel(appointment: AppointmentWithRelations) {
    if (appointment.status === AppointmentStatus.CANCELED) {
      throw new BadRequestException("Este agendamento já foi cancelado.");
    }
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException("Um atendimento finalizado não pode ser cancelado.");
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.CANCELED, canceledAt: new Date() },
      include: APPOINTMENT_INCLUDE,
    });
    return this.serialize(updated);
  }

  private async applyReschedule(
    appointment: AppointmentWithRelations,
    dto: RescheduleAppointmentDto,
  ) {
    if (
      appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        "Apenas agendamentos confirmados ou pendentes podem ser remarcados.",
      );
    }

    const targetProfessionalId = dto.professionalId ?? appointment.professionalId;

    // Revalida cada item contra o profissional de destino e recalcula a duração total a
    // partir dos snapshots já gravados (o preço não muda em remarcação).
    const durations = await Promise.all(
      appointment.items.map(async (item) => {
        // targetProfessionalId pode vir do body (dto.professionalId, ver
        // RescheduleAppointmentDto) — nunca usar sem confirmar que pertence ao mesmo tenant
        // do agendamento, senão um profissional de outro tenant que por acaso atenda o mesmo
        // serviceId passaria despercebido.
        const professionalService = await this.prisma.professionalService.findFirst({
          where: {
            professionalId: targetProfessionalId,
            serviceId: item.serviceId,
            isActive: true,
            professional: { tenantId: appointment.tenantId },
            service: { tenantId: appointment.tenantId },
          },
          include: { service: true },
        });
        if (!professionalService) {
          throw new BadRequestException(
            "Serviço não disponível para o profissional selecionado.",
          );
        }
        return (
          professionalService.durationMinutes ??
          professionalService.service.durationMinutes ??
          item.durationMinutes
        );
      }),
    );
    const totalDuration = durations.reduce((sum, minutes) => sum + minutes, 0);

    const startAt = this.parseFutureDate(
      dto.startAt,
      "Não é possível remarcar para um horário no passado.",
    );
    const endAt = startAt.plus({ minutes: totalDuration });

    return this.prisma.$transaction(async (tx) => {
      await this.lockProfessional(tx, targetProfessionalId);
      await this.assertNoConflict(
        tx,
        targetProfessionalId,
        startAt.toJSDate(),
        endAt.toJSDate(),
        appointment.id,
      );

      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          professionalId: targetProfessionalId,
          startAt: startAt.toJSDate(),
          endAt: endAt.toJSDate(),
          rescheduledCount: { increment: 1 },
        },
        include: APPOINTMENT_INCLUDE,
      });
      return this.serialize(updated);
    });
  }

  private async assertNoConflict(
    tx: Prisma.TransactionClient,
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const [conflictingAppointment, conflictingBlock] = await Promise.all([
      tx.appointment.findFirst({
        where: {
          professionalId,
          status: { in: SLOT_BLOCKING_STATUSES },
          id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
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

    if (conflictingAppointment || conflictingBlock) {
      throw new ConflictException("Este horário não está mais disponível.");
    }
  }

  // Mantém o payload compatível com o front atual (que espera `service.name` e
  // `priceCentsSnapshot` únicos) além de expor os itens do agregado.
  private serialize(appointment: AppointmentWithRelations) {
    const priceCentsSnapshot = appointment.items.reduce(
      (sum, item) => sum + item.priceCentsSnapshot,
      0,
    );
    return {
      id: appointment.id,
      tenantId: appointment.tenantId,
      professionalId: appointment.professionalId,
      // Todo atendimento é criado com 1+ item (ArrayMinSize / item único no fluxo público).
      serviceId: appointment.items[0]?.serviceId ?? "",
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      clientId: appointment.clientId,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      source: appointment.source,
      notes: appointment.notes,
      manageToken: appointment.manageToken,
      canceledAt: appointment.canceledAt,
      noShowAt: appointment.noShowAt,
      rescheduledCount: appointment.rescheduledCount,
      priceCentsSnapshot,
      service: appointment.items[0]?.service
        ? { name: appointment.items[0].service.name }
        : undefined,
      items: appointment.items.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.service.name,
        position: item.position,
        durationMinutes: item.durationMinutes,
        priceCentsSnapshot: item.priceCentsSnapshot,
      })),
      professional: {
        id: appointment.professionalId,
        user: { name: appointment.professional.user.name },
      },
      tenant: appointment.tenant ? { slug: appointment.tenant.slug } : undefined,
    };
  }
}
