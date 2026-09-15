import { ConflictException } from "@nestjs/common";
import { AppointmentStatus } from "@totalagenda/database";
import { ProfessionalsService } from "./professionals.service";
import { PrismaService } from "../prisma/prisma.service";
import { PlanLimitService } from "../billing/plan-limit.service";

function buildPlanLimitServiceMock() {
  return {
    assertCanAddProfessional: jest.fn().mockResolvedValue(undefined),
  } as unknown as PlanLimitService;
}

function professionalRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "prof-1",
    tenantId: "tenant-1",
    userId: "user-1",
    bio: null,
    isActive: true,
    user: { id: "user-1", name: "Alex", email: "alex@example.com" },
    workingHours: [],
    ...overrides,
  };
}

function buildPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
  const tx = {
    user: { update: jest.fn().mockResolvedValue({ id: "user-1" }) },
    professional: {
      update: jest.fn().mockImplementation(({ data }) => ({ ...professionalRecord(), ...data })),
    },
  };
  const prisma = {
    professional: {
      findFirst: jest.fn().mockResolvedValue(professionalRecord()),
    },
    appointment: {
      count: jest.fn().mockResolvedValue(0),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx)),
    ...overrides,
  } as unknown as PrismaService;
  return { prisma, tx };
}

describe("ProfessionalsService.update", () => {
  // Regressão: desativar um profissional não checava agendamentos futuros — o
  // agendamento continuava ocupando o horário (SLOT_BLOCKING_STATUSES) mas sumia da
  // coluna do calendário (getCalendar filtra professionals por isActive), ficando
  // invisível pro dono/recepção.
  it("recusa desativar um profissional com agendamento futuro pendente", async () => {
    const { prisma } = buildPrismaMock({
      appointment: { count: jest.fn().mockResolvedValue(1) },
    });
    const service = new ProfessionalsService(prisma, buildPlanLimitServiceMock());

    await expect(service.update("tenant-1", "prof-1", { isActive: false })).rejects.toThrow(
      ConflictException,
    );
  });

  it("permite desativar quando não há agendamento futuro pendente", async () => {
    const { prisma } = buildPrismaMock();
    const service = new ProfessionalsService(prisma, buildPlanLimitServiceMock());

    const result = await service.update("tenant-1", "prof-1", { isActive: false });

    expect(result.isActive).toBe(false);
    expect(prisma.appointment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          professionalId: "prof-1",
          status: {
            in: expect.arrayContaining([
              AppointmentStatus.SCHEDULED,
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.IN_SERVICE,
            ]),
          },
        }),
      }),
    );
  });

  it("não checa agendamento futuro ao só editar bio (isActive inalterado)", async () => {
    const { prisma } = buildPrismaMock();
    const service = new ProfessionalsService(prisma, buildPlanLimitServiceMock());

    await service.update("tenant-1", "prof-1", { bio: "Nova bio" });

    expect(prisma.appointment.count).not.toHaveBeenCalled();
  });

  it("atualiza nome e e-mail do usuário vinculado", async () => {
    const { prisma, tx } = buildPrismaMock();
    const service = new ProfessionalsService(prisma, buildPlanLimitServiceMock());

    await service.update("tenant-1", "prof-1", { name: "Novo Nome", email: "novo@example.com" });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Novo Nome", email: "novo@example.com" },
    });
  });

  it("lança ConflictException se o novo e-mail já pertence a outro usuário", async () => {
    const { prisma } = buildPrismaMock({
      user: { findUnique: jest.fn().mockResolvedValue({ id: "outro-user" }) },
    });
    const service = new ProfessionalsService(prisma, buildPlanLimitServiceMock());

    await expect(
      service.update("tenant-1", "prof-1", { email: "ocupado@example.com" }),
    ).rejects.toThrow(ConflictException);
  });
});
