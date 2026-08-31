"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export interface MarketplaceActionState {
  error?: string;
  ok?: boolean;
}

function fail(err: unknown): MarketplaceActionState {
  return { error: err instanceof ApiError ? err.message : "Erro inesperado." };
}

export async function saveMarketplaceAction(
  _p: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  const num = (k: string) => {
    const v = formData.get(k);
    return v ? Number(v) : undefined;
  };
  try {
    await authedFetch("/tenants/me/marketplace", {
      method: "PATCH",
      body: JSON.stringify({
        listedInMarketplace: formData.get("listed") === "on",
        city: String(formData.get("city") ?? "").trim() || undefined,
        neighborhood: String(formData.get("neighborhood") ?? "").trim() || undefined,
        latitude: num("latitude"),
        longitude: num("longitude"),
        priceRange: num("priceRange"),
        categorySlugs: formData.getAll("categorySlugs").map(String),
      }),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/marketplace");
  return { ok: true };
}

export async function hideReviewAction(id: string): Promise<MarketplaceActionState> {
  try {
    await authedFetch(`/reviews/${id}/hide`, { method: "PATCH" });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/marketplace");
  return { ok: true };
}

export async function reportReviewAction(id: string, reason: string): Promise<MarketplaceActionState> {
  try {
    await authedFetch(`/reviews/${id}/report`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/marketplace");
  return { ok: true };
}
