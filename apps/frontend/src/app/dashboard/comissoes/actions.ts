"use server";

import { revalidatePath } from "next/cache";
import type { CommissionReport } from "@totalagenda/shared-types";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export interface CommissionRuleState {
  error?: string;
}

export async function createCommissionRuleAction(
  _p: CommissionRuleState,
  formData: FormData,
): Promise<CommissionRuleState> {
  const base = String(formData.get("base"));
  try {
    await authedFetch("/commissions/rules", {
      method: "POST",
      body: JSON.stringify({
        professionalId: String(formData.get("professionalId")),
        base,
        targetId: base === "ALL" ? undefined : String(formData.get("targetId") || "") || undefined,
        kind: String(formData.get("kind")),
        value: Number(formData.get("value")),
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
