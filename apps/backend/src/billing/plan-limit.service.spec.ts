import { ConflictException, NotFoundException } from "@nestjs/common";
import { PlanTier } from "@totalagenda/database";
import { PlanLimitService } from "./plan-limit.service";
import { PrismaService } from "../prisma/prisma.service";

function buildPrismaMock() {
  return {
    subscription: { findUnique: jest.fn() },
    plan: { findUnique: jest.fn() },
    professional: { count: jest.fn() },
  } as unknown as PrismaService;
}

describe("PlanLimitService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: PlanLimitService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new PlanLimitService(prisma);
  });

  describe("assertCanAddProfessional", () => {
    it("permite adicionar quando não há assinatura e o trial (limite Essencial) ainda não foi atingido", async () => {
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue({
        tier: PlanTier.ESSENCIAL,
        name: "Essencial",
        maxProfessionals: 2,
      });
      (prisma.professional.count as jest.Mock).mockResolvedValue(1);

      await expect(service.assertCanAddProfessional("tenant-1")).resolves.toBeUndefined();
    });

    it("bloqueia quando o limite do plano em trial (Essencial) foi atingido", async () => {
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue({
        tier: PlanTier.ESSENCIAL,
        name: "Essencial",
        maxProfessionals: 2,
      });
      (prisma.professional.count as jest.Mock).mockResolvedValue(2);

      await expect(service.assertCanAddProfessional("tenant-1")).rejects.toThrow(ConflictException);
    });

    it("permite ilimitados profissionais no plano Premium (maxProfessionals null)", async () => {
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        plan: { tier: PlanTier.PREMIUM, name: "Premium", maxProfessionals: null },
      });
      (prisma.professional.count as jest.Mock).mockResolvedValue(50);

      await expect(service.assertCanAddProfessional("tenant-1")).resolves.toBeUndefined();
    });

    it("usa o limite do plano da assinatura ativa quando existe", async () => {
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        plan: { tier: PlanTier.PROFISSIONAL, name: "Profissional", maxProfessionals: 5 },
      });
      (prisma.professional.count as jest.Mock).mockResolvedValue(5);

      await expect(service.assertCanAddProfessional("tenant-1")).rejects.toThrow(ConflictException);
    });
  });

  describe("assertCanDowngrade", () => {
    it("permite downgrade quando profissionais ativos estão dentro do novo limite", async () => {
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue({
        tier: PlanTier.ESSENCIAL,
        name: "Essencial",
        maxProfessionals: 2,
      });
      (prisma.professional.count as jest.Mock).mockResolvedValue(2);

      await expect(
        service.assertCanDowngrade("tenant-1", PlanTier.ESSENCIAL),
      ).resolves.toBeUndefined();
    });

    it("bloqueia downgrade quando há mais profissionais ativos do que o novo limite permite", async () => {
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue({
        tier: PlanTier.ESSENCIAL,
        name: "Essencial",
        maxProfessionals: 2,
      });
      (prisma.professional.count as jest.Mock).mockResolvedValue(3);

      await expect(service.assertCanDowngrade("tenant-1", PlanTier.ESSENCIAL)).rejects.toThrow(
        ConflictException,
      );
    });

    it("permite qualquer troca para um plano com maxProfessionals ilimitado", async () => {
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue({
        tier: PlanTier.PREMIUM,
        name: "Premium",
        maxProfessionals: null,
      });
      (prisma.professional.count as jest.Mock).mockResolvedValue(100);

      await expect(
        service.assertCanDowngrade("tenant-1", PlanTier.PREMIUM),
      ).resolves.toBeUndefined();
    });

    it("lança NotFoundException se o plano de destino não existe", async () => {
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.assertCanDowngrade("tenant-1", PlanTier.PROFISSIONAL),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
