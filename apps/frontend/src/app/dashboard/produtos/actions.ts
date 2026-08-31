"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export interface ProductActionState {
  error?: string;
}

function fail(err: unknown): ProductActionState {
  return { error: err instanceof ApiError ? err.message : "Erro inesperado." };
}

function centsFromReais(value: FormDataEntryValue | null): number {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    await authedFetch("/products", {
      method: "POST",
      body: JSON.stringify({
        name: String(formData.get("name") ?? "").trim(),
        sku: String(formData.get("sku") ?? "").trim() || undefined,
        priceCents: centsFromReais(formData.get("price")),
        costCents: formData.get("cost") ? centsFromReais(formData.get("cost")) : undefined,
        initialStock: formData.get("initialStock")
          ? Number(formData.get("initialStock"))
          : undefined,
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
    await authedFetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
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
    await authedFetch(`/products/${id}/stock`, {
      method: "POST",
      body: JSON.stringify({ kind, quantity, note }),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/produtos");
  return {};
}
