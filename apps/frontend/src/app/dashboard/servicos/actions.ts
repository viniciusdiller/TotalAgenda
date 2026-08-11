"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export interface CreateServiceState {
  error?: string;
}

export async function createServiceAction(
  _prevState: CreateServiceState | undefined,
  formData: FormData,
): Promise<CreateServiceState> {
  const priceReais = Number(formData.get("price"));
  const durationMinutes = Number(formData.get("durationMinutes"));

  if (!Number.isFinite(priceReais) || priceReais < 0) {
    return { error: "Informe um preço válido." };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5) {
    return { error: "A duração mínima é de 5 minutos." };
  }

  try {
    await authedFetch("/services", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description") || undefined,
        durationMinutes,
        priceCents: Math.round(priceReais * 100),
      }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível cadastrar." };
  }

  revalidatePath("/dashboard/servicos");
  return {};
}

export async function toggleServiceActiveAction(id: string, isActive: boolean) {
  await authedFetch(`/services/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  revalidatePath("/dashboard/servicos");
}
