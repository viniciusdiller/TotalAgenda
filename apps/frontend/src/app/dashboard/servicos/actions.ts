"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { moneyToCents, parseIntStrict } from "@/lib/masks";

export interface CreateServiceState {
  error?: string;
}

export async function createServiceAction(
  _prevState: CreateServiceState | undefined,
  formData: FormData,
): Promise<CreateServiceState> {
  const rawPrice = formData.get("price");
  const priceCents = moneyToCents(typeof rawPrice === "string" ? rawPrice : null);
  const rawDuration = formData.get("durationMinutes");
  const durationMinutes = parseIntStrict(typeof rawDuration === "string" ? rawDuration : null);

  if (priceCents === null) {
    return { error: "Informe um preço válido (ex: 45,90)." };
  }
  if (durationMinutes === null || durationMinutes < 5 || durationMinutes > 1440) {
    return { error: "A duração deve ser de 5 a 1440 minutos." };
  }

  try {
    await authedFetch("/services", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description") || undefined,
        durationMinutes,
        priceCents,
      }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível cadastrar." };
  }

  revalidatePath("/dashboard/servicos");
  return {};
}

export async function updateServiceAction(
  id: string,
  input: { name: string; description?: string; durationMinutes: number; priceCents: number },
): Promise<{ error?: string }> {
  try {
    await authedFetch(`/services/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível salvar." };
  }
  revalidatePath("/dashboard/servicos");
  return {};
}

export async function toggleServiceActiveAction(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  try {
    await authedFetch(`/services/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível atualizar." };
  }
  revalidatePath("/dashboard/servicos");
  return {};
}
