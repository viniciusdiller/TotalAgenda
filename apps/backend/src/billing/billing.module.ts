import { Module } from "@nestjs/common";
import { PlanLimitService } from "./plan-limit.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { StripeService } from "./stripe.service";
import { CheckoutService } from "./checkout.service";
import { PlanChangeService } from "./plan-change.service";
import { PlanCatalogService } from "./plan-catalog.service";

@Module({
  controllers: [BillingController],
  providers: [PlanLimitService, BillingService, StripeService, CheckoutService, PlanChangeService, PlanCatalogService],
  // StripeService é exportado para o webhook do Stripe (WebhooksModule).
  exports: [PlanLimitService, StripeService],
})
export class BillingModule {}
