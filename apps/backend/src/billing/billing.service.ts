import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { computeBillingStatus } from "./billing-status.util";

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return this.prisma.plan.findMany({ orderBy: { priceCents: "asc" } });
  }

  async getTenantBillingStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { subscription: { include: { plan: true } } },
    });

    return {
      status: computeBillingStatus(tenant, tenant.subscription),
      trialEndsAt: tenant.trialEndsAt,
      subscription: tenant.subscription,
    };
  }
}
