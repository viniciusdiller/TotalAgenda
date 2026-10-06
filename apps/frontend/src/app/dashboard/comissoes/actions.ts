"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { moneyToCents, parseIntStrict } from "@/lib/masks";

export interface CommissionRuleState {
  error?: string;
}

export async function createCommissionRuleAction(
  _p: CommissionRuleState,
  formData: FormData,
): Promise<CommissionRuleState> {
  const base = String(formData.get("base"));
  const kind = String(formData.get("kind"));
  const rawValue = String(formData.get("value") ?? "");
  // PERCENT: inteiro 0–100. FIXED: reais digitados ("12,50") → centavos, que é o que o backend guarda.
  const value = kind === "FIXED" ? moneyToCents(rawValue) : parseIntStrict(rawValue);
  if (value === null || (kind === "PERCENT" && value > 100)) {
    return {
      error: kind === "FIXED" ? "Informe um valor válido (ex: 12,50)." : "Informe um percentual inteiro de 0 a 100.",
    };
  }
  try {
    await authedFetch("/commissions/rules", {
      method: "POST",
      body: JSON.stringify({
        professionalId: String(formData.get("professionalId")),
        base,
        targetId: base === "ALL" ? undefined : String(formData.get("targetId") || "") || undefined,
        kind,
        value,
      }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Erro ao salvar regra." };
  }
  revalidatePath("/dashboard/comissoes");
  return {};
}

export interface PayoutState {
  error?: string;
}

// Registra um repasse. O valor digitado vira centavos com moneyToCents (estrito: texto mal
// formado é erro pro usuário, NUNCA 0 em silêncio). O servidor recalcula o saldo e recusa acima dele.
export async function registerPayoutAction(
  professionalId: string,
  amount: string,
  note: string,
): Promise<PayoutState> {
  const amountCents = moneyToCents(amount);
  if (amountCents === null || amountCents < 1) {
    return { error: "Informe um valor válido (ex: 150,00)." };
  }
  try {
    await authedFetch("/finance/commissions/payouts", {
      method: "POST",
      body: JSON.stringify({ professionalId, amountCents, note: note.trim() || undefined }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Erro ao registrar o repasse." };
  }
  revalidatePath("/dashboard/comissoes");
  revalidatePath("/dashboard/financeiro");
  return {};
}
