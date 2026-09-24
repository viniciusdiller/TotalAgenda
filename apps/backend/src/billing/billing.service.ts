import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { computeBillingStatus } from "./billing-status.util";

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    // Endpoint PÚBLICO: só o que a tela de planos mostra. Ids internos e stripePriceId ficam de fora.
    return this.prisma.plan.findMany({
      orderBy: { priceCents: "asc" },
      select: { tier: true, name: true, priceCents: true, maxProfessionals: true },
    });
  }

  async getTenantBillingStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { subscription: { include: { plan: true } } },
    });

    // Qualquer papel de staff chama esta rota: devolve só o necessário para a tela, sem os ids do
    // Stripe (customer/subscription) e sem ids internos.
    const subscription = tenant.subscription;
    return {
      status: computeBillingStatus(tenant, subscription),
      trialEndsAt: tenant.trialEndsAt,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            plan: {
              tier: subscription.plan.tier,
              name: subscription.plan.name,
              priceCents: subscription.plan.priceCents,
              maxProfessionals: subscription.plan.maxProfessionals,
            },
          }
        : null,
    };
  }
}
