"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { moneyToCents, parseIntStrict } from "@/lib/masks";

export interface ProductActionState {
  error?: string;
}

function fail(err: unknown): ProductActionState {
  return { error: err instanceof ApiError ? err.message : "Erro inesperado." };
}

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value.trim() : "");

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const priceCents = moneyToCents(text(formData.get("price")));
  if (priceCents === null) return { error: "Informe um preço válido (ex: 45,90)." };
  const costRaw = text(formData.get("cost"));
  const costCents = costRaw ? moneyToCents(costRaw) : undefined;
  if (costCents === null) return { error: "Informe um custo válido (ex: 20,00)." };
  const stockRaw = text(formData.get("initialStock"));
  const initialStock = stockRaw ? parseIntStrict(stockRaw) : undefined;
  if (initialStock === null) return { error: "O estoque inicial deve ser um número inteiro." };
  try {
    await authedFetch("/products", {
      method: "POST",
      body: JSON.stringify({
        name: String(formData.get("name") ?? "").trim(),
        sku: String(formData.get("sku") ?? "").trim() || undefined,
        priceCents,
        costCents,
        initialStock,
      }),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/produtos");
  return {};
}

export async function updateProductAction(
  id: string,
  patch: { name?: string; priceCents?: number; isActive?: boolean },
): Promise<ProductActionState> {
  try {
    await authedFetch(`/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/produtos");
  return {};
}

export async function adjustStockAction(
  id: string,
  kind: "IN" | "OUT" | "ADJUSTMENT",
  quantity: number,
  note?: string,
): Promise<ProductActionState> {
  try {
    await authedFetch(`/products/${encodeURIComponent(id)}/stock`, {
      method: "POST",
      body: JSON.stringify({ kind, quantity, note }),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/produtos");
  return {};
}
