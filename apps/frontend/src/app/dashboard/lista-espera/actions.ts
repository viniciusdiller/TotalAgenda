"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";

export async function updateWaitlistStatusAction(id: string, status: string) {
  await authedFetch(`/waitlist/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  revalidatePath("/dashboard/lista-espera");
}
