"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ApiError } from "@/lib/api";
import { clearConsumerToken, consumerAuthedFetch, setConsumerToken } from "@/lib/consumer-session";

export interface FormState {
  error?: string;
  success?: string;
}

export async function logoutConsumerAction() {
  await clearConsumerToken();
  redirect("/entrar");
}

// Uma Server Action que deixa o erro estourar sem tratar perde a mensagem: o Next redige a
// mensagem original de um erro não capturado que atravessa a fronteira server/client em
// produção. Por isso o ApiError é capturado e devolvido como { error } em vez de propagado.
function messageFor(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.statusCode === 401 ? "Sua sessão expirou. Entre novamente." : error.message;
  }
  return fallback;
}

export async function updateProfileAction(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  try {
    await consumerAuthedFetch("/public/consumer/me", {
      method: "PATCH",
      body: JSON.stringify({ name, email }),
    });
  } catch (error) {
    return { error: messageFor(error, "Não foi possível salvar seus dados.") };
  }
  revalidatePath("/minha-conta");
  return { success: "Dados atualizados." };
}

export async function changePasswordAction(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  if (newPassword !== confirm) return { error: "As senhas não conferem." };

  try {
    // Trocar a senha derruba todas as sessões antigas no backend; a resposta traz uma sessão nova
    // (pra quem trocou continuar logado aqui) e é ela que vai pro cookie.
    const userAgent = (await headers()).get("user-agent") ?? "";
    const result = await consumerAuthedFetch<{ accessToken: string }>("/public/consumer/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
      headers: { "User-Agent": userAgent },
    });
    await setConsumerToken(result.accessToken);
  } catch (error) {
    return { error: messageFor(error, "Não foi possível trocar a senha.") };
  }
  return { success: "Senha alterada. Você foi desconectado dos outros dispositivos." };
}

export async function revokeSessionAction(sessionId: string) {
  try {
    await consumerAuthedFetch(`/public/consumer/sessions/${sessionId}`, { method: "DELETE" });
  } catch {
    // Falha silenciosa: o pior caso é o dispositivo continuar na lista até a próxima tentativa —
    // não é uma ação crítica o bastante pra propagar erro pra UI aqui.
  }
  revalidatePath("/minha-conta");
}

export async function revokeOtherSessionsAction() {
  try {
    await consumerAuthedFetch("/public/consumer/sessions", { method: "DELETE" });
  } catch {
    // Mesma lógica de revokeSessionAction.
  }
  revalidatePath("/minha-conta");
}

export async function cancelMyBookingAction(bookingId: string) {
  try {
    await consumerAuthedFetch(`/public/consumer/bookings/${bookingId}/cancel`, { method: "PATCH" });
  } catch (error) {
    return { error: messageFor(error, "Não foi possível cancelar.") };
  }
  revalidatePath("/minha-conta");
  return { error: null };
}

export async function rescheduleMyBookingAction(bookingId: string, startAt: string) {
  try {
    await consumerAuthedFetch(`/public/consumer/bookings/${bookingId}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({ startAt }),
    });
  } catch (error) {
    return { error: messageFor(error, "Não foi possível remarcar.") };
  }
  revalidatePath("/minha-conta");
  return { error: null };
}
