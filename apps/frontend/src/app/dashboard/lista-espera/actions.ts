"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export async function updateWaitlistStatusAction(
  id: string,
  status: string,
): Promise<{ error?: string }> {
  try {
    await authedFetch(`/waitlist/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível atualizar." };
  }
  revalidatePath("/dashboard/lista-espera");
  return {};
}
