import { plainToInstance } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
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
