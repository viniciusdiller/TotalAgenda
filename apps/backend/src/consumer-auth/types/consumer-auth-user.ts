import { createHash } from "crypto";

export interface ConsumerJwtPayload {
  sub: string; // consumerId
  // Discriminador — nunca existe nos tokens de staff nem de client, então um token de
  // consumidor global não passa em nenhuma rota daqueles domínios.
  type: "consumer";
  // "Versão" da senha (prefixo do sha256 do hash): trocar a senha muda o valor e derruba todas
  // as sessões antigas — sem isso um token roubado valia até o fim da janela mesmo após a troca.
  // Redundante com a revogação por ConsumerSession abaixo (defesa em profundidade barata).
  pv: string;
  // Id da linha ConsumerSession que este token representa — um dispositivo/login. É o que
  // permite revogar UM dispositivo sem derrubar os outros (ver ConsumerJwtAuthGuard).
  sid: string;
}

export interface AuthenticatedConsumer {
  consumerId: string;
  sessionId: string;
}

// Não expõe o hash (só o prefixo do sha256 dele) e não precisa de coluna nova no banco.
export function passwordVersion(passwordHash: string | null): string {
  return createHash("sha256").update(passwordHash ?? "").digest("hex").slice(0, 16);
}
