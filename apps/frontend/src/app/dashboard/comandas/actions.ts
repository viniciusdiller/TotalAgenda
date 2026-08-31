"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Ticket } from "@totalagenda/shared-types";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export interface TicketActionResult {
  ok: boolean;
  error?: string;
  ticket?: Ticket;
}

function fail(err: unknown): TicketActionResult {
  return { ok: false, error: err instanceof ApiError ? err.message : "Erro inesperado." };
}

async function mutate(path: string, body?: unknown): Promise<TicketActionResult> {
  try {
    const ticket = await authedFetch<Ticket>(path, {
      method: body === undefined ? "POST" : "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    revalidatePath("/dashboard/comandas");
    if (ticket?.id) revalidatePath(`/dashboard/comandas/${ticket.id}`);
    return { ok: true, ticket };
  } catch (err) {
    return fail(err);
  }
}

export async function openTicketAction(input: {
  appointmentId?: string;
  clientId?: string;
}): Promise<TicketActionResult> {
  const result = await mutate("/tickets", input);
  if (result.ok && result.ticket) redirect(`/dashboard/comandas/${result.ticket.id}`);
  return result;
}

export async function addItemAction(id: string, body: unknown): Promise<TicketActionResult> {
  return mutate(`/tickets/${id}/items`, body);
}

export async function removeItemAction(id: string, itemId: string): Promise<TicketActionResult> {
  try {
    const ticket = await authedFetch<Ticket>(`/tickets/${id}/items/${itemId}`, { method: "DELETE" });
    revalidatePath(`/dashboard/comandas/${id}`);
    return { ok: true, ticket };
  } catch (err) {
    return fail(err);
  }
}

export async function setDiscountAction(id: string, discountCents: number) {
  try {
    const ticket = await authedFetch<Ticket>(`/tickets/${id}/discount`, {
      method: "PATCH",
      body: JSON.stringify({ discountCents }),
    });
    revalidatePath(`/dashboard/comandas/${id}`);
    return { ok: true, ticket };
  } catch (err) {
    return fail(err);
  }
}

export async function addPaymentAction(id: string, body: unknown): Promise<TicketActionResult> {
  return mutate(`/tickets/${id}/payments`, body);
}

export async function closeTicketAction(id: string): Promise<TicketActionResult> {
  const result = await mutate(`/tickets/${id}/close`, {});
  if (result.ok) {
    revalidatePath("/dashboard/comandas");
    redirect("/dashboard/comandas");
  }
  return result;
}

export async function cancelTicketAction(id: string): Promise<TicketActionResult> {
  const result = await mutate(`/tickets/${id}/cancel`, {});
  if (result.ok) redirect("/dashboard/comandas");
  return result;
}
