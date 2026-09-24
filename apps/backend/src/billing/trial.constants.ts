// Duração do trial de quem se cadastra sozinho (POST /public/signup). Sem cartão: quando
// `trialEndsAt` passa e não há Subscription, computeBillingStatus devolve TRIAL_EXPIRED e o
// TenantBillingGuard bloqueia (ver billing-status.util.ts).
export const TRIAL_DAYS = 14;
