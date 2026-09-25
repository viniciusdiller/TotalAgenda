// CATÁLOGO DE PLANOS — a ÚNICA definição de preço e limite do TotalAgenda.
//
// Para mudar um preço ou limite: edite AQUI, faça o deploy, e crie o Price novo no Stripe (o valor de um Price é
// imutável) apontando STRIPE_PRICE_<TIER> para ele. Quem consome este arquivo:
//   - backend: PlanCatalogService grava a tabela `Plan` a partir dele a cada boot, e confere que o Price do Stripe
//     tem o mesmo valor antes de cobrar (checkout e troca de plano falham fechado se divergir);
//   - seed do banco (packages/database/prisma/seed.ts);
//   - frontend: só o texto de apresentação (`audience`); os PREÇOS o app lê de GET /plans, nunca daqui;
//   - site institucional (outro repo): lê GET /plans e usa uma cópia como fallback offline, só para quando a API
//     estiver fora do ar. Ao mudar aqui, atualize também essa cópia (TotalSoftware/src/data/produtos.ts).
//
// Dinheiro em CENTAVOS inteiros (regra do projeto). `maxProfessionals: null` = ilimitado.
// A migration `seed_plans` tem valores antigos de propósito (histórica): o sync do boot corrige o banco.

export type PlanCatalogTier = "ESSENCIAL" | "PROFISSIONAL" | "PREMIUM";

export interface PlanCatalogEntry {
  readonly tier: PlanCatalogTier;
  readonly name: string;
  readonly priceCents: number;
  readonly maxProfessionals: number | null;
  // Frase de apresentação (cadastro e tela de plano). Só texto: não afeta cobrança nem limites.
  readonly audience: string;
}

export const PLAN_CATALOG: readonly PlanCatalogEntry[] = [
  {
    tier: "ESSENCIAL",
    name: "Essencial",
    priceCents: 4990,
    maxProfessionals: 2,
    audience: "Para quem trabalha sozinho ou em dupla.",
  },
  {
    tier: "PROFISSIONAL",
    name: "Profissional",
    priceCents: 9990,
    maxProfessionals: 5,
    audience: "Para salões e barbearias com equipe pequena.",
  },
  {
    tier: "PREMIUM",
    name: "Premium",
    priceCents: 18990,
    maxProfessionals: null,
    audience: "Para equipes grandes e negócios em crescimento.",
  },
];

// O Price do Stripe tem que ser exatamente isto para o valor cobrado ser o valor mostrado.
export const PLAN_CURRENCY = "brl";
export const PLAN_INTERVAL = "month";

export function planCatalogEntry(tier: string): PlanCatalogEntry | undefined {
  return PLAN_CATALOG.find((plan) => plan.tier === tier);
}
