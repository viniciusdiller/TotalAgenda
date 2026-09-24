import { PrismaService } from "../prisma/prisma.service";
import { BillingService } from "./billing.service";

function buildPrisma(tenant: Record<string, unknown>) {
  return {
    tenant: { findUniqueOrThrow: jest.fn().mockResolvedValue(tenant) },
  } as unknown as PrismaService;
}

const PLAN = {
  id: "plan-secret-id",
  tier: "PROFISSIONAL",
  name: "Profissional",
  priceCents: 7990,
  maxProfessionals: 5,
  stripePriceId: "price_interno",
};

describe("BillingService.getTenantBillingStatus", () => {
  // Qualquer papel de staff (inclusive recepção e profissional) chama esta rota: nada de id do
  // Stripe, do plano ou da assinatura na resposta.
  it("não vaza ids do Stripe nem ids internos", async () => {
    const trialEndsAt = new Date(Date.now() + 86_400_000);
    const currentPeriodEnd = new Date(Date.now() + 5 * 86_400_000);
    const prisma = buildPrisma({
      id: "tenant-1",
      trialEndsAt,
      stripeCustomerId: "cus_123",
      subscription: {
        id: "sub-row-id",
        tenantId: "tenant-1",
        planId: "plan-secret-id",
        status: "ACTIVE",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        plan: PLAN,
      },
    });

    const result = await new BillingService(prisma).getTenantBillingStatus("tenant-1");

    expect(result).toEqual({
      status: "ACTIVE",
      trialEndsAt,
      subscription: {
        status: "ACTIVE",
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        plan: { tier: "PROFISSIONAL", name: "Profissional", priceCents: 7990, maxProfessionals: 5 },
      },
    });
    const serialized = JSON.stringify(result);
    for (const secret of ["cus_123", "sub_123", "plan-secret-id", "sub-row-id", "price_interno", "tenant-1"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("sem assinatura devolve subscription null e o estado do trial", async () => {
    const trialEndsAt = new Date(Date.now() + 86_400_000);
    const prisma = buildPrisma({ id: "tenant-1", trialEndsAt, subscription: null });

    await expect(new BillingService(prisma).getTenantBillingStatus("tenant-1")).resolves.toEqual({
      status: "TRIALING",
      trialEndsAt,
      subscription: null,
    });
  });

  it("consulta pelo tenant do JWT", async () => {
    const prisma = buildPrisma({ trialEndsAt: new Date(), subscription: null });

    await new BillingService(prisma).getTenantBillingStatus("tenant-do-jwt");

    expect(prisma.tenant.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tenant-do-jwt" } }),
    );
  });
});
