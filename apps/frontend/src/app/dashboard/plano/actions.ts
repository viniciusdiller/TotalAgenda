"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import type { PlanChangePreview, PlanTier } from "@/lib/billing";

// Server Actions são alcançáveis por POST direto, não só pela tela: por isso cada uma valida o que
// recebe e o backend decide tudo de verdade (papel OWNER, preço, tenant, excesso de profissionais).
// Nada aqui carrega valor em dinheiro: o cliente só diz QUAL plano.
const TIERS: readonly PlanTier[] = ["ESSENCIAL", "PROFISSIONAL", "PREMIUM"];
const isTier = (value: unknown): value is PlanTier => TIERS.includes(value as PlanTier);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INVALID = { error: "Pedido inválido." } as const;

function failure(error: unknown) {
  return { error: error instanceof ApiError ? error.message : "Não foi possível concluir. Tente novamente." };
}

// O destino do redirecionamento (Stripe) vem do backend; só seguimos https.
function safeUrl(url: unknown): string | null {
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}

export async function startCheckoutAction(tier: PlanTier): Promise<{ url: string } | { error: string }> {
  if (!isTier(tier)) return INVALID;
  try {
    const { url } = await authedFetch<{ url: string }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ tier }),
    });
    const safe = safeUrl(url);
    return safe ? { url: safe } : { error: "O serviço de pagamento não devolveu um link válido." };
  } catch (error) {
    return failure(error);
  }
}

export async function openPortalAction(): Promise<{ url: string } | { error: string }> {
  try {
    const { url } = await authedFetch<{ url: string }>("/billing/portal", { method: "POST" });
    const safe = safeUrl(url);
    return safe ? { url: safe } : { error: "O serviço de pagamento não devolveu um link válido." };
  } catch (error) {
    return failure(error);
  }
}

export async function previewPlanChangeAction(
  tier: PlanTier,
): Promise<{ preview: PlanChangePreview } | { error: string }> {
  if (!isTier(tier)) return INVALID;
  try {
    return { preview: await authedFetch<PlanChangePreview>(`/billing/change-plan/preview?tier=${encodeURIComponent(tier)}`) };
  } catch (error) {
    return failure(error);
  }
}

export async function changePlanAction(
  tier: PlanTier,
  deactivateProfessionalIds: string[],
): Promise<{ ok: true } | { error: string }> {
  if (!isTier(tier) || !Array.isArray(deactivateProfessionalIds)) return INVALID;
  if (deactivateProfessionalIds.length > 50 || !deactivateProfessionalIds.every((id) => UUID.test(id))) {
    return INVALID;
  }
  try {
    await authedFetch("/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ tier, deactivateProfessionalIds }),
    });
  } catch (error) {
    return failure(error);
  }
  // Plano, limites e a lista de profissionais mudaram; o banner do layout também.
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
