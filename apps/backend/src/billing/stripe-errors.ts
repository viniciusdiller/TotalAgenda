import { BadGatewayException, HttpException, Logger } from "@nestjs/common";

export const STRIPE_UNAVAILABLE_MESSAGE =
  "Não foi possível falar com o serviço de pagamento agora. Tente novamente em instantes.";

// Toda chamada ao Stripe que falha vira o MESMO 502 genérico para o dono. Nada do erro original
// (mensagem, ids, corpo) chega ao cliente, e o log guarda só tipo, código e id da requisição —
// nunca a mensagem inteira nem dados do cliente.
export function failStripeCall(logger: Logger, action: string, error: unknown): never {
  // Erros que já são HTTP (ex.: 503 "cobrança não configurada") passam como estão.
  if (error instanceof HttpException) throw error;

  const stripeError = error as { type?: string; code?: string; requestId?: string } | null;
  logger.error(
    `Falha no Stripe ao ${action} (tipo=${stripeError?.type ?? "desconhecido"}, ` +
      `código=${stripeError?.code ?? "-"}, requisição=${stripeError?.requestId ?? "-"}).`,
  );
  throw new BadGatewayException(STRIPE_UNAVAILABLE_MESSAGE);
}
