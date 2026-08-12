import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { BookingStatus } from "@totalagenda/database";
import { BookingsService } from "./bookings.service";
import { PrismaService } from "../prisma/prisma.service";
import { ClientsService } from "../clients/clients.service";

const FUTURE_DATE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

function buildClientsServiceMock() {
  return {
    upsertForBooking: jest.fn().mockResolvedValue({ id: "client-1" }),
  } as unknown as ClientsService;
}

function buildTxMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    booking: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "booking-1", ...data })),
      update: jest.fn().mockImplementation(({ data }) => ({ id: "booking-1", ...data })),
    },
    timeBlock: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
}

function buildPrismaMock(tx: ReturnType<typeof buildTxMock>) {
  return {
    tenant: { findUnique: jest.fn().mockResolvedValue({ id: "tenant-1" }) },
    professionalService: {
      findUnique: jest.fn().mockResolvedValue({
        durationMinutes: null,
        priceCents: null,
        isActive: true,
        professional: { id: "prof-1", tenantId: "tenant-1", isActive: true },
        service: { id: "svc-1", tenantId: "tenant-1", isActive: true, durationMinutes: 60, priceCents: 8000 },
      }),
    },
    booking: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx)),
  } as unknown as PrismaService;
}

describe("BookingsService", () => {
  const clientsService = buildClientsServiceMock();

  const baseDto = {
    professionalId: "prof-1",
    serviceId: "svc-1",
    startAt: FUTURE_DATE,
    clientName: "Cliente Teste",
    clientPhone: "11999998888",
  };

  it("cria um booking com sucesso quando não há conflito", async () => {
    const tx = buildTxMock();
    const prisma = buildPrismaMock(tx);
    const service = new BookingsService(prisma, clientsService);

    const result = await service.createFromPublicLink("slug", baseDto);

    expect(tx.booking.create).toHaveBeenCalledTimes(1);
    expect((result as any).manageToken).toBeDefined();
  });

  it("lança ConflictException quando já existe um booking CONFIRMED sobreposto", async () => {
    const tx = buildTxMock({
      booking: {
        findFirst: jest.fn().mockResolvedValue({ id: "existing-booking" }),
        create: jest.fn(),
      },
    });
    const prisma = buildPrismaMock(tx);
    const service = new BookingsService(prisma, clientsService);

    await expect(service.createFromPublicLink("slug", baseDto)).rejects.toThrow(ConflictException);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it("lança ConflictException quando o horário colide com um TimeBlock", async () => {
    const tx = buildTxMock({
      timeBlock: { findFirst: jest.fn().mockResolvedValue({ id: "block-1" }) },
    });
    const prisma = buildPrismaMock(tx);
    const service = new BookingsService(prisma, clientsService);

    await expect(service.createFromPublicLink("slug", baseDto)).rejects.toThrow(ConflictException);
  });

  it("lança BadRequestException ao tentar agendar no passado", async () => {
    const tx = buildTxMock();
    const prisma = buildPrismaMock(tx);
    const service = new BookingsService(prisma, clientsService);

    await expect(
      service.createFromPublicLink("slug", { ...baseDto, startAt: "2020-01-01T10:00:00-03:00" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("lança NotFoundException quando o serviço não está disponível para o profissional", async () => {
    const tx = buildTxMock();
    const prisma = buildPrismaMock(tx);
    (prisma.professionalService.findUnique as jest.Mock).mockResolvedValue(null);
    const service = new BookingsService(prisma, clientsService);

    await expect(service.createFromPublicLink("slug", baseDto)).rejects.toThrow(NotFoundException);
  });

  describe("cancelByToken", () => {
    it("cancela um booking CONFIRMED", async () => {
      const tx = buildTxMock();
      const prisma = buildPrismaMock(tx);
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: "booking-1",
        status: BookingStatus.CONFIRMED,
      });
      (prisma as any).booking.update = jest
        .fn()
        .mockImplementation(({ data }) => ({ id: "booking-1", ...data }));
      const service = new BookingsService(prisma, clientsService);

      const result = await service.cancelByToken("token-1");

      expect((result as any).status).toBe(BookingStatus.CANCELED);
    });

    it("lança BadRequestException se já estiver cancelado", async () => {
      const tx = buildTxMock();
      const prisma = buildPrismaMock(tx);
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: "booking-1",
        status: BookingStatus.CANCELED,
      });
      const service = new BookingsService(prisma, clientsService);

      await expect(service.cancelByToken("token-1")).rejects.toThrow(BadRequestException);
    });

    it("lança NotFoundException se o token não existe", async () => {
      const tx = buildTxMock();
      const prisma = buildPrismaMock(tx);
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);
      const service = new BookingsService(prisma, clientsService);

      await expect(service.cancelByToken("token-invalido")).rejects.toThrow(NotFoundException);
    });
  });

  describe("rescheduleByToken", () => {
    it("reagenda e incrementa rescheduledCount quando não há conflito", async () => {
      const tx = buildTxMock();
      const prisma = buildPrismaMock(tx);
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: "booking-1",
        status: BookingStatus.CONFIRMED,
        professionalId: "prof-1",
        serviceId: "svc-1",
      });
      const service = new BookingsService(prisma, clientsService);

      await service.rescheduleByToken("token-1", { startAt: FUTURE_DATE });

      expect(tx.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rescheduledCount: { increment: 1 } }),
        }),
      );
    });

    it("lança ConflictException quando o novo horário colide com outro booking", async () => {
      const tx = buildTxMock({
        booking: {
          findFirst: jest.fn().mockResolvedValue({ id: "other-booking" }),
          update: jest.fn(),
        },
      });
      const prisma = buildPrismaMock(tx);
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: "booking-1",
        status: BookingStatus.CONFIRMED,
        professionalId: "prof-1",
        serviceId: "svc-1",
      });
      const service = new BookingsService(prisma, clientsService);

      await expect(service.rescheduleByToken("token-1", { startAt: FUTURE_DATE })).rejects.toThrow(
        ConflictException,
      );
    });

    it("lança BadRequestException se o booking não estiver CONFIRMED", async () => {
      const tx = buildTxMock();
      const prisma = buildPrismaMock(tx);
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: "booking-1",
        status: BookingStatus.CANCELED,
      });
      const service = new BookingsService(prisma, clientsService);

      await expect(service.rescheduleByToken("token-1", { startAt: FUTURE_DATE })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
