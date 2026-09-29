import { NotFoundException } from "@nestjs/common";
import { ServicesService } from "./services.service";
import { PrismaService } from "../prisma/prisma.service";

function buildPrismaMock() {
  return {
    service: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    professional: { findFirst: jest.fn() },
    professionalService: { upsert: jest.fn(), findMany: jest.fn() },
    tenant: { findUnique: jest.fn() },
  } as unknown as PrismaService;
}

describe("ServicesService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: ServicesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ServicesService(prisma);
  });

  describe("create", () => {
    it("cria o serviço escopado ao tenant do chamador", async () => {
      (prisma.service.create as jest.Mock).mockResolvedValue({ id: "svc-1" });

      await service.create("tenant-1", { name: "Corte", durationMinutes: 30, priceCents: 5000 } as any);

      expect(prisma.service.create).toHaveBeenCalledWith({
        data: { tenantId: "tenant-1", name: "Corte", durationMinutes: 30, priceCents: 5000 },
      });
    });
  });

  describe("findAllByTenant", () => {
    it("filtra por tenantId na cláusula where", () => {
      service.findAllByTenant("tenant-1");
      expect(prisma.service.findMany).toHaveBeenCalledWith({ where: { tenantId: "tenant-1" } });
    });
  });

  describe("findOneOrThrow", () => {
    // Regressão de IDOR: buscar por id sozinho e comparar dono depois abre uma janela —
    // o filtro de tenantId tem que estar dentro da própria query.
    it("não encontra um serviço de outro tenant mesmo com o id correto", async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOneOrThrow("tenant-1", "svc-de-outro-tenant")).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.service.findFirst).toHaveBeenCalledWith({
        where: { id: "svc-de-outro-tenant", tenantId: "tenant-1" },
      });
    });

    it("retorna o serviço quando pertence ao tenant", async () => {
      const found = { id: "svc-1", tenantId: "tenant-1" };
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(found);

      await expect(service.findOneOrThrow("tenant-1", "svc-1")).resolves.toBe(found);
    });
  });

  describe("update", () => {
    it("rejeita atualizar um serviço que não é do tenant antes de chamar update", async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update("tenant-1", "svc-de-outro-tenant", { name: "Hackeado" } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.service.update).not.toHaveBeenCalled();
    });

    it("atualiza quando o serviço pertence ao tenant", async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({ id: "svc-1", tenantId: "tenant-1" });
      (prisma.service.update as jest.Mock).mockResolvedValue({ id: "svc-1", name: "Corte novo" });

      const result = await service.update("tenant-1", "svc-1", { name: "Corte novo" } as any);

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: "svc-1" },
        data: { name: "Corte novo" },
      });
      expect(result).toEqual({ id: "svc-1", name: "Corte novo" });
    });
  });

  describe("linkToProfessional", () => {
    it("rejeita vincular a um profissional de outro tenant", async () => {
      (prisma.professional.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.linkToProfessional("tenant-1", "prof-de-outro-tenant", {
          serviceId: "svc-1",
        } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.professionalService.upsert).not.toHaveBeenCalled();
    });

    it("rejeita vincular um serviço que não é do tenant", async () => {
      (prisma.professional.findFirst as jest.Mock).mockResolvedValue({ id: "prof-1", tenantId: "tenant-1" });
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.linkToProfessional("tenant-1", "prof-1", { serviceId: "svc-de-outro-tenant" } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.professionalService.upsert).not.toHaveBeenCalled();
    });

    it("faz upsert do vínculo quando profissional e serviço são do mesmo tenant", async () => {
      (prisma.professional.findFirst as jest.Mock).mockResolvedValue({ id: "prof-1", tenantId: "tenant-1" });
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({ id: "svc-1", tenantId: "tenant-1" });
      (prisma.professionalService.upsert as jest.Mock).mockResolvedValue({ professionalId: "prof-1", serviceId: "svc-1" });

      await service.linkToProfessional("tenant-1", "prof-1", {
        serviceId: "svc-1",
        durationMinutes: 45,
        priceCents: 6000,
        isActive: true,
      } as any);

      expect(prisma.professionalService.upsert).toHaveBeenCalledWith({
        where: { professionalId_serviceId: { professionalId: "prof-1", serviceId: "svc-1" } },
        update: { durationMinutes: 45, priceCents: 6000, isActive: true },
        create: {
          professionalId: "prof-1",
          serviceId: "svc-1",
          durationMinutes: 45,
          priceCents: 6000,
          isActive: true,
        },
      });
    });
  });

  describe("findPublicByTenantSlug", () => {
    it("rejeita slug de negócio inexistente", async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findPublicByTenantSlug("salao-que-nao-existe")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("só busca serviços ativos do tenant encontrado pelo slug", async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: "tenant-1" });
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);

      await service.findPublicByTenantSlug("salao-demo");

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { tenantId: "tenant-1", isActive: true },
        select: { id: true, name: true, description: true, durationMinutes: true, priceCents: true },
      });
    });
  });
});
