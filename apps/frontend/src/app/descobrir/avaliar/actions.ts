"use server";

import { ApiError } from "@/lib/api";
import { consumerAuthedFetch } from "@/lib/consumer-session";

// Erro devolvido como valor (não lançado): o Next redige a mensagem de erros não capturados
// que cruzam a fronteira server/client em produção.
export async function submitReviewAction(input: {
  appointmentId: string;
  rating: number;
  comment?: string;
}): Promise<{ error: string | null }> {
  try {
    await consumerAuthedFetch("/public/consumer/reviews", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.statusCode === 401 ? "Sua sessão expirou. Entre novamente." : error.message };
    }
    return { error: "Erro ao enviar." };
  }
}
