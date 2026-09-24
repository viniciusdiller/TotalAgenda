"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { moneyToCents } from "@/lib/masks";

export interface CashActionState {
  error?: string;
  closeResult?: { expectedCashCents: number; differenceCents: number };
}

// Valor inválido NÃO vira 0 em silêncio: abrir o caixa com fundo 0 sem aviso escondia o erro de digitação.
const cents = (v: FormDataEntryValue | null) => moneyToCents(typeof v === "string" ? v : null);
const INVALID_AMOUNT: CashActionState = { error: "Informe um valor válido (ex: 45,90)." };

function fail(err: unknown): CashActionState {
  return { error: err instanceof ApiError ? err.message : "Erro inesperado." };
}

export async function openCashAction(
  _p: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const openingFloatCents = cents(formData.get("float"));
  if (openingFloatCents === null) return INVALID_AMOUNT;
  try {
    await authedFetch("/cash-register/open", {
      method: "POST",
      body: JSON.stringify({ openingFloatCents }),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/caixa");
  return {};
}

export async function cashMovementAction(
  _p: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const amountCents = cents(formData.get("amount"));
  if (amountCents === null || amountCents < 1) return INVALID_AMOUNT;
  try {
    await authedFetch("/cash-register/movements", {
      method: "POST",
      body: JSON.stringify({
        kind: String(formData.get("kind")),
        amountCents,
        note: String(formData.get("note") ?? "").trim() || undefined,
      }),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/caixa");
  return {};
}

export async function closeCashAction(
  _p: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const closingCountedCents = cents(formData.get("counted"));
  if (closingCountedCents === null) return INVALID_AMOUNT;
  try {
    const result = await authedFetch<{ expectedCashCents: number; differenceCents: number }>(
      "/cash-register/close",
      {
        method: "POST",
        body: JSON.stringify({ closingCountedCents }),
      },
    );
    revalidatePath("/dashboard/caixa");
    return { closeResult: result };
  } catch (err) {
    return fail(err);
  }
}
