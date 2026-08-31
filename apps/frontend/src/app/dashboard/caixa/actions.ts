"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export interface CashActionState {
  error?: string;
  closeResult?: { expectedCashCents: number; differenceCents: number };
}

const cents = (v: FormDataEntryValue | null) =>
  Math.round(Number(String(v ?? "").replace(",", ".")) * 100) || 0;

function fail(err: unknown): CashActionState {
  return { error: err instanceof ApiError ? err.message : "Erro inesperado." };
}

export async function openCashAction(
  _p: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  try {
    await authedFetch("/cash-register/open", {
      method: "POST",
      body: JSON.stringify({ openingFloatCents: cents(formData.get("float")) }),
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
  try {
    await authedFetch("/cash-register/movements", {
      method: "POST",
      body: JSON.stringify({
        kind: String(formData.get("kind")),
        amountCents: cents(formData.get("amount")),
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
  try {
    const result = await authedFetch<{ expectedCashCents: number; differenceCents: number }>(
      "/cash-register/close",
      {
        method: "POST",
        body: JSON.stringify({ closingCountedCents: cents(formData.get("counted")) }),
      },
    );
    revalidatePath("/dashboard/caixa");
    return { closeResult: result };
  } catch (err) {
    return fail(err);
  }
}
