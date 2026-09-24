"use server";

import { revalidatePath } from "next/cache";
import type { CommissionReport } from "@totalagenda/shared-types";
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

export async function fetchCommissionReportAction(
  from: string,
  to: string,
  professionalId?: string,
): Promise<CommissionReport> {
  const params = new URLSearchParams({ from, to });
  if (professionalId) params.set("professionalId", professionalId);
  return authedFetch<CommissionReport>(`/commissions/report?${params.toString()}`);
}
