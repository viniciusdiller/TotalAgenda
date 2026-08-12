"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export interface UpdateProfileState {
  error?: string;
  success?: boolean;
}

export async function updateTenantProfileAction(
  _prevState: UpdateProfileState | undefined,
  formData: FormData,
): Promise<UpdateProfileState> {
  const accentColor = String(formData.get("accentColor") ?? "").trim();
  if (accentColor && !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    return { error: "Cor inválida. Use o formato #RRGGBB." };
  }

  try {
    await authedFetch("/tenants/me", {
      method: "PATCH",
      body: JSON.stringify({
        description: formData.get("description") || undefined,
        address: formData.get("address") || undefined,
        businessHours: formData.get("businessHours") || undefined,
        accentColor: accentColor || undefined,
      }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível salvar." };
  }

  revalidatePath("/dashboard/configuracoes");
  return { success: true };
}

export interface UploadLogoState {
  error?: string;
}

export async function uploadLogoAction(
  _prevState: UploadLogoState | undefined,
  formData: FormData,
): Promise<UploadLogoState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione uma imagem." };
  }

  try {
    const uploadData = new FormData();
    uploadData.set("file", file);
    await authedFetch("/tenants/me/logo", { method: "POST", body: uploadData });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível enviar a imagem." };
  }

  revalidatePath("/dashboard/configuracoes");
  return {};
}

export async function removeLogoAction() {
  await authedFetch("/tenants/me/logo", { method: "DELETE" });
  revalidatePath("/dashboard/configuracoes");
}
