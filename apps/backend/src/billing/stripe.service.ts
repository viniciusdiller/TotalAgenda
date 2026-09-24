import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PlanTier } from "@totalagenda/database";
import Stripe from "stripe";

const PRICE_ENV_BY_TIER: Record<PlanTier, string> = {
  [PlanTier.ESSENCIAL]: "STRIPE_PRICE_ESSENCIAL",
  [PlanTier.PROFISSIONAL]: "STRIPE_PRICE_PROFISSIONAL",
  [PlanTier.PREMIUM]: "STRIPE_PRICE_PREMIUM",
};

export const BILLING_NOT_CONFIGURED_MESSAGE = "Cobrança não configurada neste ambiente.";

// Único ponto que fala com o SDK do Stripe e que conhece a configuração de cobrança. Em
// desenvolvimento as variáveis são opcionais: sem elas o backend sobe normalmente e só as rotas de
// cobrança respondem 503 (em produção o boot falha, ver env.validation.ts).
@Injectable()
export class StripeService {
  private client: Stripe | null = null;

  constructor(private readonly config: ConfigService) {}

  // Cliente criado só na primeira chamada. Retentativas de rede só para chamadas idempotentes (o
  // SDK já manda idempotency key nas escritas que ele mesmo repete) e timeout curto: a requisição do
  // dono espera por isto.
  get sdk(): Stripe {
    const key = this.config.get<string>("STRIPE_SECRET_KEY");
    if (!key) throw new ServiceUnavailableException(BILLING_NOT_CONFIGURED_MESSAGE);
    this.client ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
    return this.client;
  }

  get webhookSecret(): string | undefined {
    return this.config.get<string>("STRIPE_WEBHOOK_SECRET") || undefined;
  }

  // O preço cobrado SEMPRE vem daqui (env), nunca do cliente: o cliente só escolhe o tier.
  priceIdForTier(tier: PlanTier): string {
    const priceId = this.config.get<string>(PRICE_ENV_BY_TIER[tier]);
    if (!priceId) throw new ServiceUnavailableException(BILLING_NOT_CONFIGURED_MESSAGE);
    return priceId;
  }

  // Caminho inverso, usado pelo webhook: o Price da assinatura diz qual plano ela é (nunca o nome).
  tierForPriceId(priceId: string): PlanTier | null {
    for (const tier of Object.values(PlanTier)) {
      if (this.config.get<string>(PRICE_ENV_BY_TIER[tier]) === priceId) return tier;
    }
    return null;
  }

  // Destino dos retornos do checkout e do portal. Montado no servidor; nunca vem do cliente.
  frontendUrl(): string {
    return (this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  }
}
