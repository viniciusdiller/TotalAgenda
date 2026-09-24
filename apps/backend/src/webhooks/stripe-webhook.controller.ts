import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import type Stripe from "stripe";
import { Public } from "../common/decorators/public.decorator";
import { StripeService } from "../billing/stripe.service";
import { StripeWebhookService } from "./stripe-webhook.service";

// Chamado pelo Stripe, sem login: a ÚNICA autenticação é a assinatura do corpo (Stripe-Signature),
// conferida sobre os bytes CRUS da requisição (main.ts liga `rawBody`). Reserializar o JSON
// invalidaria a assinatura. O Stripe manda rajadas de vários IPs e reentrega em caso de erro, então
// o limite por IP não se aplica aqui; quem não assina direito nunca passa da verificação.
@Controller("webhooks/stripe")
export class StripeWebhookController {
  constructor(
    private readonly stripe: StripeService,
    private readonly webhookService: StripeWebhookService,
  ) {}

  @Public()
  @SkipThrottle()
  @HttpCode(200)
  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined,
  ) {
    const secret = this.stripe.webhookSecret;
    // Sem segredo não dá para verificar nada: 503 (o Stripe reenvia) em vez de aceitar sem checar.
    if (!secret) throw new ServiceUnavailableException("Webhook não configurado.");
    if (!signature || !req.rawBody) throw new BadRequestException("Requisição inválida.");

    let event: Stripe.Event;
    try {
      event = this.stripe.sdk.webhooks.constructEvent(req.rawBody, signature, secret);
    } catch {
      // Mensagem única: não diz se faltou assinatura, se o segredo é outro ou se o corpo mudou.
      throw new BadRequestException("Assinatura inválida.");
    }

    await this.webhookService.handle(event);
    return { received: true };
  }
}
