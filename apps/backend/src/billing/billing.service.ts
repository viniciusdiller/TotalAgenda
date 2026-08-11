import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PlanTier, Role, SubscriptionStatus } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { PlanLimitService } from "./plan-limit.service";
import { computeBillingStatus } from "./billing-status.util";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { ChangePlanDto } from "./dto/change-plan.dto";

const STRIPE_STATUS_MAP: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  active: SubscriptionStatus.ACTIVE,
  past_due: SubscriptionStatus.PAST_DUE,
  canceled: SubscriptionStatus.CANCELED,
  incomplete: SubscriptionStatus.INCOMPLETE,
  incomplete_expired: SubscriptionStatus.CANCELED,
  trialing: SubscriptionStatus.ACTIVE,
  unpaid: SubscriptionStatus.UNPAID,
  paused: SubscriptionStatus.CANCELED,
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly planLimitService: PlanLimitService,
  ) {}

  private getStripeClient(): Stripe {
    const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      throw new BadRequestException(
        "Stripe ainda não está configurado (defina STRIPE_SECRET_KEY).",
      );
    }
    return new Stripe(secretKey);
  }

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

  async createCheckoutSession(tenantId: string, dto: CreateCheckoutSessionDto) {
    const stripe = this.getStripeClient();

    const plan = await this.prisma.plan.findUnique({ where: { tier: dto.tier } });
    if (!plan) {
      throw new NotFoundException("Plano não encontrado.");
    }

    const [tenant, existingSubscription, owner] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      this.prisma.subscription.findUnique({ where: { tenantId } }),
      this.prisma.user.findFirst({ where: { tenantId, role: Role.OWNER } }),
    ]);

    const customerId =
      existingSubscription?.stripeCustomerId ??
      (
        await stripe.customers.create({
          email: owner?.email,
          name: tenant.name,
          metadata: { tenantId },
        })
      ).id;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      metadata: { tenantId, planTier: plan.tier },
    });

    return { url: session.url };
  }

  async createPortalSession(tenantId: string, returnUrl: string) {
    const stripe = this.getStripeClient();

    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!subscription) {
      throw new BadRequestException("Este negócio ainda não tem uma assinatura ativa.");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async changePlan(tenantId: string, dto: ChangePlanDto) {
    await this.planLimitService.assertCanDowngrade(tenantId, dto.tier);

    const stripe = this.getStripeClient();
    const plan = await this.prisma.plan.findUnique({ where: { tier: dto.tier } });
    if (!plan) {
      throw new NotFoundException("Plano não encontrado.");
    }

    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!subscription) {
      throw new BadRequestException(
        "Este negócio ainda não tem uma assinatura ativa. Use o checkout para assinar.",
      );
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{ id: stripeSubscription.items.data[0].id, price: plan.stripePriceId }],
      proration_behavior: "create_prorations",
    });

    return this.prisma.subscription.update({
      where: { tenantId },
      data: { planId: plan.id },
    });
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    const stripe = this.getStripeClient();
    const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new BadRequestException("STRIPE_WEBHOOK_SECRET não configurado.");
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.upsertSubscriptionFromStripe(
          session.metadata?.tenantId,
          session.subscription as string,
        );
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        await this.syncSubscriptionRecord(stripeSubscription);
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async upsertSubscriptionFromStripe(
    tenantId: string | undefined,
    stripeSubscriptionId: string,
  ) {
    if (!tenantId || !stripeSubscriptionId) {
      return;
    }
    const stripe = this.getStripeClient();
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    await this.syncSubscriptionRecord(stripeSubscription, tenantId);
  }

  private async syncSubscriptionRecord(stripeSubscription: Stripe.Subscription, tenantId?: string) {
    const resolvedTenantId = tenantId ?? (stripeSubscription.metadata?.tenantId as string | undefined);
    if (!resolvedTenantId) {
      return;
    }

    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const plan = priceId ? await this.prisma.plan.findUnique({ where: { stripePriceId: priceId } }) : null;
    if (!plan) {
      return;
    }

    const status = STRIPE_STATUS_MAP[stripeSubscription.status] ?? SubscriptionStatus.INCOMPLETE;
    const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

    await this.prisma.subscription.upsert({
      where: { tenantId: resolvedTenantId },
      update: {
        planId: plan.id,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
      create: {
        tenantId: resolvedTenantId,
        planId: plan.id,
        stripeCustomerId: stripeSubscription.customer as string,
        stripeSubscriptionId: stripeSubscription.id,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });
  }
}
