import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AppointmentStatus, Role } from "@totalagenda/database";
import { AppointmentsService } from "./appointments.service";
import { PrismaService } from "../prisma/prisma.service";
import { ClientsService } from "../clients/clients.service";
import { AuthenticatedUser } from "../auth/types/auth-user";

const FUTURE_DATE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

function buildClientsServiceMock() {
  return {
    upsertForBooking: jest.fn().mockResolvedValue({ id: "client-1" }),
  } as unknown as ClientsService;
}

// Um atendimento "hidratado" como o APPOINTMENT_INCLUDE devolve — usado pelo serialize().
function hydratedAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: "appt-1",
    tenantId: "tenant-1",
    professionalId: "prof-1",
    clientName: "Cliente Teste",
    clientPhone: "11999998888",
    clientId: "client-1",
    startAt: new Date(FUTURE_DATE),
    endAt: new Date(Date.now() + 25 * 60 * 60 * 1000),
    status: AppointmentStatus.CONFIRMED,
    source: "PUBLIC",
    notes: null,
    manageToken: "token-1",
    canceledAt: null,
    noShowAt: null,
    rescheduledCount: 0,
    items: [
      {
        id: "item-1",
        serviceId: "svc-1",
        position: 0,
        durationMinutes: 60,
        priceCentsSnapshot: 8000,
        service: { id: "svc-1", name: "Corte" },
      },
    ],
    professional: { user: { name: "Alex" } },
    tenant: { slug: "slug" },
    ...overrides,
  };
}

function buildTxMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    appointment: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(hydratedAppointment()),
      update: jest.fn().mockImplementation(({ data }) => hydratedAppointment(data)),
    },
    timeBlock: { findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  };
}

function buildPrismaMock(tx: ReturnType<typeof buildTxMock>) {
  return {
    tenant: { findUnique: jest.fn().mockResolvedValue({ id: "tenant-1" }) },
    professional: { findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }) },
    client: { findFirst: jest.fn().mockResolvedValue({ id: "client-1", name: "Cliente Teste", phone: "11999998888" }) },
    professionalService: {
      findUnique: jest.fn().mockResolvedValue({
        durationMinutes: null,
        priceCents: null,
        isActive: true,
        professional: { id: "prof-1", tenantId: "tenant-1", isActive: true },
        service: { id: "svc-1", tenantId: "tenant-1", isActive: true, durationMinutes: 60, priceCents: 8000 },
      }),
    },
    appointment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(({ data }) => hydratedAppointment(data)),
    },
    $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx)),
  } as unknown as PrismaService;
}

const owner: AuthenticatedUser = { userId: "u-1", tenantId: "tenant-1", role: Role.OWNER };

describe("AppointmentsService", () => {
  const clientsService = buildClientsServiceMock();

  const baseDto = {
    professionalId: "prof-1",
    serviceId: "svc-1",
    startAt: FUTURE_DATE,
    clientName: "Cliente Teste",
    clientPhone: "11999998888",
  };

  describe("createFromPublicLink", () => {
    it("cria um atendimento CONFIRMED com 1 item quando não há conflito", async () => {
      const tx = buildTxMock();
      const service = new AppointmentsService(buildPrismaMock(tx), clientsService);

      const result = await service.createFromPublicLink("slug", baseDto);

      expect(tx.appointment.create).toHaveBeenCalledTimes(1);
      expect(result.manageToken).toBeDefined();
      expect(result.priceCentsSnapshot).toBe(8000);
      expect(result.items).toHaveLength(1);
    });

    it("lança ConflictException quando há atendimento sobreposto que ocupa a agenda", async () => {
      const tx = buildTxMock({
        appointment: {
          findFirst: jest.fn().mockResolvedValue({ id: "existing" }),
          create: jest.fn(),
        },
      });
      const service = new AppointmentsService(buildPrismaMock(tx), clientsService);

      await expect(service.createFromPublicLink("slug", baseDto)).rejects.toThrow(ConflictException);
      expect(tx.appointment.create).not.toHaveBeenCalled();
    });

    it("lança ConflictException quando colide com um TimeBlock", async () => {
      const tx = buildTxMock({ timeBlock: { findFirst: jest.fn().mockResolvedValue({ id: "block-1" }) } });
      const service = new AppointmentsService(buildPrismaMock(tx), clientsService);

      await expect(service.createFromPublicLink("slug", baseDto)).rejects.toThrow(ConflictException);
    });

    it("lança BadRequestException ao agendar no passado", async () => {
      const service = new AppointmentsService(buildPrismaMock(buildTxMock()), clientsService);

      await expect(
        service.createFromPublicLink("slug", { ...baseDto, startAt: "2020-01-01T10:00:00-03:00" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("lança NotFoundException quando o serviço não está disponível para o profissional", async () => {
      const prisma = buildPrismaMock(buildTxMock());
      (prisma.professionalService.findUnique as jest.Mock).mockResolvedValue(null);
      const service = new AppointmentsService(prisma, clientsService);

      await expect(service.createFromPublicLink("slug", baseDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe("createByStaff", () => {
    it("cria atendimento SCHEDULED por padrão com cadastro rápido de cliente", async () => {
      const tx = buildTxMock();
      const service = new AppointmentsService(buildPrismaMock(tx), clientsService);

      await service.createByStaff(owner, {
        professionalId: "prof-1",
        startAt: FUTURE_DATE,
        items: [{ serviceId: "svc-1" }],
        clientName: "Novo Cliente",
        clientPhone: "11988887777",
      });

      const data = (tx.appointment.create as jest.Mock).mock.calls[0][0].data;
      expect(data.status).toBe(AppointmentStatus.SCHEDULED);
      expect(data.source).toBe("STAFF");
    });

    it("recusa PROFESSIONAL criando para a agenda de outro profissional", async () => {
      const service = new AppointmentsService(buildPrismaMock(buildTxMock()), clientsService);
      const pro: AuthenticatedUser = {
        userId: "u-2",
        tenantId: "tenant-1",
        role: Role.PROFESSIONAL,
        professionalId: "prof-2",
      };

      await expect(
        service.createByStaff(pro, {
          professionalId: "prof-1",
          startAt: FUTURE_DATE,
          items: [{ serviceId: "svc-1" }],
          clientId: "client-1",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("exige cliente existente ou nome+telefone", async () => {
      const prisma = buildPrismaMock(buildTxMock());
      const service = new AppointmentsService(prisma, clientsService);

      await expect(
        service.createByStaff(owner, {
          professionalId: "prof-1",
          startAt: FUTURE_DATE,
          items: [{ serviceId: "svc-1" }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("cancelByToken", () => {
    it("cancela um atendimento CONFIRMED", async () => {
      const prisma = buildPrismaMock(buildTxMock());
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(hydratedAppointment());
      const service = new AppointmentsService(prisma, clientsService);

      const result = await service.cancelByToken("token-1");

      expect(result.status).toBe(AppointmentStatus.CANCELED);
    });

    it("lança BadRequestException se já estiver cancelado", async () => {
      const prisma = buildPrismaMock(buildTxMock());
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(
        hydratedAppointment({ status: AppointmentStatus.CANCELED }),
      );
      const service = new AppointmentsService(prisma, clientsService);

      await expect(service.cancelByToken("token-1")).rejects.toThrow(BadRequestException);
    });

    it("lança NotFoundException se o token não existe", async () => {
      const prisma = buildPrismaMock(buildTxMock());
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);
      const service = new AppointmentsService(prisma, clientsService);

      await expect(service.cancelByToken("nao-existe")).rejects.toThrow(NotFoundException);
    });
  });

  describe("rescheduleByToken", () => {
    it("reagenda e incrementa rescheduledCount quando não há conflito", async () => {
      const tx = buildTxMock();
      const prisma = buildPrismaMock(tx);
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(hydratedAppointment());
      const service = new AppointmentsService(prisma, clientsService);

      await service.rescheduleByToken("token-1", { startAt: FUTURE_DATE });

      expect(tx.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rescheduledCount: { increment: 1 } }),
        }),
      );
    });

    it("lança ConflictException quando o novo horário colide", async () => {
      const tx = buildTxMock({
        appointment: {
          findFirst: jest.fn().mockResolvedValue({ id: "other" }),
          update: jest.fn(),
        },
      });
      const prisma = buildPrismaMock(tx);
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(hydratedAppointment());
      const service = new AppointmentsService(prisma, clientsService);

      await expect(service.rescheduleByToken("token-1", { startAt: FUTURE_DATE })).rejects.toThrow(
        ConflictException,
      );
    });

    it("lança BadRequestException se o atendimento estiver finalizado", async () => {
      const prisma = buildPrismaMock(buildTxMock());
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(
        hydratedAppointment({ status: AppointmentStatus.COMPLETED }),
      );
      const service = new AppointmentsService(prisma, clientsService);

      await expect(service.rescheduleByToken("token-1", { startAt: FUTURE_DATE })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("updateStatus", () => {
    it("permite CONFIRMED -> IN_SERVICE", async () => {
      const prisma = buildPrismaMock(buildTxMock());
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(hydratedAppointment());
      const service = new AppointmentsService(prisma, clientsService);

      const result = await service.updateStatus(owner, "appt-1", { status: "IN_SERVICE" });

      expect(result.status).toBe(AppointmentStatus.IN_SERVICE);
    });

    it("recusa transição inválida COMPLETED -> IN_SERVICE", async () => {
      const prisma = buildPrismaMock(buildTxMock());
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(
        hydratedAppointment({ status: AppointmentStatus.COMPLETED }),
      );
      const service = new AppointmentsService(prisma, clientsService);

      await expect(
        service.updateStatus(owner, "appt-1", { status: "IN_SERVICE" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("carimba noShowAt ao marcar NO_SHOW", async () => {
      const prisma = buildPrismaMock(buildTxMock());
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(hydratedAppointment());
      const service = new AppointmentsService(prisma, clientsService);

      await service.updateStatus(owner, "appt-1", { status: "NO_SHOW" });

      const data = (prisma.appointment.update as jest.Mock).mock.calls[0][0].data;
      expect(data.noShowAt).toBeInstanceOf(Date);
    });
  });
});
