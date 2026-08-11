import { SubscriptionStatus } from "@totalagenda/database";

export type BillingStatus = "TRIALING" | "TRIAL_EXPIRED" | SubscriptionStatus;

export function computeBillingStatus(
  tenant: { trialEndsAt: Date },
  subscription: { status: SubscriptionStatus } | null,
): BillingStatus {
  if (subscription) {
    return subscription.status;
  }
  return tenant.trialEndsAt.getTime() > Date.now() ? "TRIALING" : "TRIAL_EXPIRED";
}

// PAST_DUE ainda concede acesso (grace period durante retries do Stripe); os demais estados bloqueiam.
export function hasBillingAccess(status: BillingStatus): boolean {
  return status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE";
}
