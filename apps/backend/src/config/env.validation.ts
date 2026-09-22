import { plainToInstance } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  // Assina TODOS os tokens (staff, refresh, cliente): segredo curto é força-bruta offline
  // trivial. 32+ caracteres (ex.: `openssl rand -hex 32`); fail closed no boot.
  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT?: number;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  // Nº de proxies confiáveis à frente do backend (ver main.ts). Ausente = não confia em nenhum.
  @IsOptional()
  @IsInt()
  @Min(1)
  TRUST_PROXY_HOPS?: number;

  // Segredo compartilhado com o Admin-TotalSoftware para autenticar os webhooks de
  // provisionamento/sincronização de assinatura (ver src/webhooks). Obrigatório: sem ele
  // o WebhookSecretGuard rejeita todas as chamadas (fail closed).
  @IsString()
  @IsNotEmpty()
  TOTALAGENDA_WEBHOOK_SECRET!: string;

  // Documental: URL pública deste backend que o Admin-TotalSoftware chama para os
  // webhooks de provisionamento/sincronização. Não é lida pelo código, só existe para
  // manter o contrato de nomes entre os dois repositórios.
  @IsOptional()
  @IsString()
  TOTALAGENDA_PROVISION_WEBHOOK_URL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Config inválida: ${errors.toString()}`);
  }

  return validated;
}
