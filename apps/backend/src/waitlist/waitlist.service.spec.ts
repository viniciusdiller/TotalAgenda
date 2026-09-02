import { BadRequestException, NotFoundException } from "@nestjs/common";
import { WaitlistService } from "./waitlist.service";
import { PrismaService } from "../prisma/prisma.service";
import { ClientsService } from "../clients/clients.service";

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    tenant: { findUnique: jest.fn().mockResolvedValue({ id: "tenant-1" }) },
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

function buildClientsService() {
  return {
    upsertForBooking: jest.fn().mockResolvedValue({ id: "client-1" }),
  } as unknown as ClientsService;
}

const baseDto = {
  serviceId: "svc-1",
  clientName: "Cliente Teste",
  clientPhone: "11999998888",
};

describe("WaitlistService.createFromPublicLink", () => {
  it("cria a entrada quando serviço (e profissional, se informado) pertencem ao tenant", async () => {
    const prisma = buildPrisma();
    const service = new WaitlistService(prisma, buildClientsService());

    const result = await service.createFromPublicLink("slug", {
      ...baseDto,
      professionalId: "prof-1",
    });

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
    const service = new WaitlistService(prisma, buildClientsService());

    await expect(service.createFromPublicLink("slug", baseDto)).rejects.toThrow(BadRequestException);
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it("rejeita professionalId que não pertence ao tenant do slug", async () => {
    const prisma = buildPrisma({ professional: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new WaitlistService(prisma, buildClientsService());

    await expect(
      service.createFromPublicLink("slug", { ...baseDto, professionalId: "prof-de-outro-tenant" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it("lança NotFoundException se o tenant não existe", async () => {
    const prisma = buildPrisma({ tenant: { findUnique: jest.fn().mockResolvedValue(null) } });
    const service = new WaitlistService(prisma, buildClientsService());

    await expect(service.createFromPublicLink("slug-invalido", baseDto)).rejects.toThrow(
      NotFoundException,
    );
  });
});
