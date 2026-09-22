import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { WaitlistService } from "./waitlist.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConsumerAuthService } from "../consumer-auth/consumer-auth.service";

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    tenant: {
      findUnique: jest.fn().mockResolvedValue({ id: "tenant-1" }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "tenant-1",
        trialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        subscription: null,
      }),
    },
    service: {
      findFirst: jest.fn().mockResolvedValue({ id: "svc-1" }),
    },
    professional: {
      findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }),
    },
    waitlistEntry: {
      create: jest.fn().mockImplementation(({ data }) => ({ id: "w-1", ...data })),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    ...overrides,
  } as unknown as PrismaService;
}

function buildConsumerAuth() {
  return {
    ensureLink: jest
      .fn()
      .mockResolvedValue({ id: "client-1", name: "Cliente Teste", phone: "11999998888" }),
  } as unknown as ConsumerAuthService;
}

const consumer = { consumerId: "consumer-1", sessionId: "session-1" };

const baseDto = {
  serviceId: "svc-1",
};

describe("WaitlistService.createFromPublicLink", () => {
  it("cria a entrada quando serviço (e profissional, se informado) pertencem ao tenant", async () => {
    const prisma = buildPrisma();
    const service = new WaitlistService(prisma, buildConsumerAuth());

    const result = await service.createFromPublicLink(
      "slug",
      { ...baseDto, professionalId: "prof-1" },
      consumer,
    );

    expect(prisma.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "svc-1", tenantId: "tenant-1" }) }),
    );
    expect(prisma.professional.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "prof-1", tenantId: "tenant-1" }) }),
    );
    expect(result.tenantId).toBe("tenant-1");
  });

  // Regressão: serviceId/professionalId do link público entravam direto no create sem
  // nenhuma checagem — um cliente podia apontar pra um serviço/profissional de outro tenant,
  // e esse nome vazaria no findAllByTenant (include de service/professional) do tenant errado.
  it("rejeita serviceId que não pertence ao tenant do slug", async () => {
    const prisma = buildPrisma({ service: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new WaitlistService(prisma, buildConsumerAuth());

    await expect(service.createFromPublicLink("slug", baseDto, consumer)).rejects.toThrow(BadRequestException);
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it("rejeita professionalId que não pertence ao tenant do slug", async () => {
    const prisma = buildPrisma({ professional: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new WaitlistService(prisma, buildConsumerAuth());

    await expect(
      service.createFromPublicLink("slug", { ...baseDto, professionalId: "prof-de-outro-tenant" }, consumer),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it("lança NotFoundException se o tenant não existe", async () => {
    const prisma = buildPrisma({ tenant: { findUnique: jest.fn().mockResolvedValue(null) } });
    const service = new WaitlistService(prisma, buildConsumerAuth());

    await expect(service.createFromPublicLink("slug-invalido", baseDto, consumer)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Mesma regressão de AppointmentsService.createFromPublicLink: rota @Public() não passa
  // pelo TenantBillingGuard, então trial vencido não impedia novas entradas na lista de espera.
  it("lança ForbiddenException quando o tenant não tem acesso de billing (trial vencido)", async () => {
    const prisma = buildPrisma({
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: "tenant-1" }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: "tenant-1",
          trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          subscription: null,
        }),
      },
    });
    const service = new WaitlistService(prisma, buildConsumerAuth());

    await expect(service.createFromPublicLink("slug", baseDto, consumer)).rejects.toThrow(ForbiddenException);
  });

  // Identidade vem da sessão do Consumer, nunca do body (mesma regra do agendamento).
  it("grava nome/telefone do Client derivado de ensureLink", async () => {
    const prisma = buildPrisma();
    const consumerAuth = buildConsumerAuth();
    const service = new WaitlistService(prisma, consumerAuth);

    const result = await service.createFromPublicLink("slug", baseDto, consumer);

    expect(consumerAuth.ensureLink).toHaveBeenCalledWith(prisma, "consumer-1", "tenant-1");
    expect(result).toMatchObject({ clientName: "Cliente Teste", clientPhone: "11999998888", clientId: "client-1" });
  });
});
