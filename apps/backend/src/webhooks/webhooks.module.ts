import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { StripeWebhookService } from "./stripe-webhook.service";

@Module({
  imports: [BillingModule],
  controllers: [WebhooksController, StripeWebhookController],
  providers: [WebhooksService, StripeWebhookService],
})
export class WebhooksModule {}
