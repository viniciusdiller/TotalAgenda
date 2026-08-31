export interface ConsumerJwtPayload {
  sub: string; // consumerId
  // Discriminador — nunca existe nos tokens de staff nem de client, então um token de
  // consumidor global não passa em nenhuma rota daqueles domínios.
  type: "consumer";
}

export interface AuthenticatedConsumer {
  consumerId: string;
}
