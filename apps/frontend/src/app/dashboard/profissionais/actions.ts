"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export interface CreateProfessionalState {
  error?: string;
}

export async function createProfessionalAction(
  _prevState: CreateProfessionalState | undefined,
  formData: FormData,
): Promise<CreateProfessionalState> {
  try {
    await authedFetch("/professionals", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        initialPassword: formData.get("initialPassword"),
      }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível cadastrar." };
  }

  revalidatePath("/dashboard/profissionais");
  return {};
}

export async function toggleProfessionalActiveAction(id: string, isActive: boolean) {
  await authedFetch(`/professionals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  revalidatePath("/dashboard/profissionais");
}
