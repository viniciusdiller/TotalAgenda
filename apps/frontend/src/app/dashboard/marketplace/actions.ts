"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { parseCoordinate } from "@/lib/masks";

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
  // Coordenada: aceita vírgula ("-23,55") e recusa lixo com mensagem clara (antes virava NaN → 400 críptico).
  // As duas juntas ou nenhuma: uma metade sozinha não localiza nada.
  const rawLat = String(formData.get("latitude") ?? "").trim();
  const rawLng = String(formData.get("longitude") ?? "").trim();
  const latitude = rawLat ? parseCoordinate(rawLat, "lat") : undefined;
  const longitude = rawLng ? parseCoordinate(rawLng, "lng") : undefined;
  if (latitude === null) return { error: "Latitude inválida (de -90 a 90, ex: -23,5505)." };
  if (longitude === null) return { error: "Longitude inválida (de -180 a 180, ex: -46,6333)." };
  if ((latitude === undefined) !== (longitude === undefined)) {
    return { error: "Informe latitude e longitude juntas, ou deixe as duas em branco." };
  }
  try {
    await authedFetch("/tenants/me/marketplace", {
      method: "PATCH",
      body: JSON.stringify({
        listedInMarketplace: formData.get("listed") === "on",
        city: String(formData.get("city") ?? "").trim() || undefined,
        neighborhood: String(formData.get("neighborhood") ?? "").trim() || undefined,
        latitude,
        longitude,
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
