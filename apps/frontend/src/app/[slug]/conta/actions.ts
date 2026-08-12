"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientAuthedFetch, clearClientToken } from "@/lib/client-session";

export async function logoutClientAction(slug: string) {
  await clearClientToken(slug);
  redirect(`/${slug}`);
}

export async function cancelMyBookingAction(slug: string, bookingId: string) {
  await clientAuthedFetch(slug, `/public/tenants/${slug}/my-bookings/${bookingId}/cancel`, {
    method: "PATCH",
  });
  revalidatePath(`/${slug}/conta`);
}

export async function rescheduleMyBookingAction(slug: string, bookingId: string, startAt: string) {
  await clientAuthedFetch(slug, `/public/tenants/${slug}/my-bookings/${bookingId}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify({ startAt }),
  });
  revalidatePath(`/${slug}/conta`);
}
