-- Os três planos passam a existir em QUALQUER banco migrado, não só onde se rodou o seed de demonstração.
-- Sem eles, um dono recém-cadastrado (trial, sem Subscription) não consegue adicionar profissional
-- (PlanLimitService usa o Essencial como teto do trial) e a tela de planos fica vazia.
-- Idempotente: onde os planos já existem (seed, ambiente antigo) não muda nada. O stripePriceId é só o
-- valor exigido pela coluna UNIQUE; o Price real vem das variáveis STRIPE_PRICE_* (StripeService).
INSERT INTO "Plan" ("id", "tier", "name", "priceCents", "maxProfessionals", "stripePriceId", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'ESSENCIAL', 'Essencial', 2990, 2, 'price_essencial_pending', now()),
  (gen_random_uuid()::text, 'PROFISSIONAL', 'Profissional', 7990, 5, 'price_profissional_pending', now()),
  (gen_random_uuid()::text, 'PREMIUM', 'Premium', 14990, NULL, 'price_premium_pending', now())
ON CONFLICT DO NOTHING;
