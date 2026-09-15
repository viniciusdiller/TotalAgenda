"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { clientAuthedFetch, clearClientToken } from "@/lib/client-session";

export async function logoutClientAction(slug: string) {
  await clearClientToken(slug);
  redirect(`/${slug}`);
}

// Uma Server Action que deixa o erro estourar sem tratar perde a mensagem: o Next
// redact a mensagem original de um erro não capturado que atravessa a fronteira
// server/client em produção. Por isso aqui (como em todo outro *.actions.ts do
// dashboard) o ApiError é capturado e devolvido como { error } em vez de propagado.
export async function cancelMyBookingAction(slug: string, bookingId: string) {
  try {
    await clientAuthedFetch(slug, `/public/tenants/${slug}/my-bookings/${bookingId}/cancel`, {
      method: "PATCH",
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível cancelar." };
  }
  revalidatePath(`/${slug}/conta`);
  return { error: null };
}

export async function rescheduleMyBookingAction(slug: string, bookingId: string, startAt: string) {
  try {
    await clientAuthedFetch(slug, `/public/tenants/${slug}/my-bookings/${bookingId}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({ startAt }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível remarcar." };
  }
  revalidatePath(`/${slug}/conta`);
  return { error: null };
}
