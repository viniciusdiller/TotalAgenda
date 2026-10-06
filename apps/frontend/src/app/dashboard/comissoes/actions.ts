"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { moneyToCents, parseIntStrict } from "@/lib/masks";

export interface CommissionRuleState {
  error?: string;
  /** true quando a gravação deu certo; o formulário de edição usa pra fechar. */
  ok?: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Lê o formulário de regra. O frontend NUNCA é a validação (o backend revalida tudo): aqui só vira
// formato certo (centavos, inteiro) e devolve erro legível em vez de mandar lixo.
function parseRuleForm(formData: FormData): { body: Record<string, unknown> } | { error: string } {
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
  return {
    body: {
      professionalId: String(formData.get("professionalId")),
      base,
      targetId: base === "ALL" ? undefined : String(formData.get("targetId") || "") || undefined,
      kind,
      value,
    },
  };
}

function failure(err: unknown, fallback: string): CommissionRuleState {
  return { error: err instanceof ApiError ? err.message : fallback };
}

export async function createCommissionRuleAction(
  _p: CommissionRuleState,
  formData: FormData,
): Promise<CommissionRuleState> {
  const parsed = parseRuleForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    await authedFetch("/commissions/rules", { method: "POST", body: JSON.stringify(parsed.body) });
  } catch (err) {
    return failure(err, "Erro ao salvar regra.");
  }
  revalidatePath("/dashboard/comissoes");
  return { ok: true };
}

// O id vem de um argumento de Server Action (controlado pelo cliente): só UUID passa, nada de
// "../" ou "%2f" chegando em montagem de caminho. O backend ainda isola por tenant.
export async function updateCommissionRuleAction(
  id: string,
  _p: CommissionRuleState,
  formData: FormData,
): Promise<CommissionRuleState> {
  if (!UUID_RE.test(id)) return { error: "Regra inválida." };
  const parsed = parseRuleForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  // O checkbox desmarcado simplesmente não vai no formulário, então "ausente" tem que virar false aqui
  // (senão desligar uma regra seria impossível).
  const isActive = formData.get("isActive") === "on";
  try {
    await authedFetch(`/commissions/rules/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ ...parsed.body, isActive }),
    });
  } catch (err) {
    return failure(err, "Erro ao salvar a regra.");
  }
  revalidatePath("/dashboard/comissoes");
  return { ok: true };
}

export async function deleteCommissionRuleAction(id: string): Promise<CommissionRuleState> {
  if (!UUID_RE.test(id)) return { error: "Regra inválida." };
  try {
    await authedFetch(`/commissions/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    return failure(err, "Erro ao excluir a regra.");
  }
  revalidatePath("/dashboard/comissoes");
  return { ok: true };
}

export interface PayoutState {
  error?: string;
}

// Registra um repasse. O valor digitado vira centavos com moneyToCents (estrito: texto mal
// formado é erro pro usuário, NUNCA 0 em silêncio). O servidor recalcula o saldo e recusa acima dele,
// valida a faixa da data e usa `requestKey` pra não pagar duas vezes o mesmo clique.
export async function registerPayoutAction(
  professionalId: string,
  amount: string,
  note: string,
  paidOn: string,
  requestKey: string | undefined,
): Promise<PayoutState> {
  if (!UUID_RE.test(professionalId)) return { error: "Profissional inválido." };
  const amountCents = moneyToCents(amount);
  if (amountCents === null || amountCents < 1) {
    return { error: "Informe um valor válido (ex: 150,00)." };
  }
  if (!DATE_RE.test(paidOn)) return { error: "Informe a data do pagamento." };
  if (requestKey !== undefined && !UUID_RE.test(requestKey)) requestKey = undefined;
  try {
    await authedFetch("/finance/commissions/payouts", {
      method: "POST",
      body: JSON.stringify({
        professionalId,
        amountCents,
        note: note.trim() || undefined,
        paidOn,
        requestKey,
      }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Erro ao registrar o repasse." };
  }
  revalidatePath("/dashboard/comissoes");
  revalidatePath("/dashboard/financeiro");
  return {};
}
