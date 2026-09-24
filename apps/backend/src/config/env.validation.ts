import { plainToInstance } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from "class-validator";

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

  // URL pública do frontend: destino do retorno do checkout/portal do Stripe. Sem ela em produção o
  // padrão seria localhost, então é obrigatória com NODE_ENV=production.
  @ValidateIf((o) => o.NODE_ENV === "production" || o.FRONTEND_URL !== undefined)
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ["http", "https"] })
  FRONTEND_URL?: string;

  // Nº de proxies confiáveis à frente do backend (ver main.ts). Ausente = não confia em nenhum.
  @IsOptional()
  @IsInt()
  @Min(1)
  TRUST_PROXY_HOPS?: number;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  // Segredo compartilhado com o frontend que assina o IP do visitante repassado nas chamadas
  // server-side (ver ClientIpThrottlerGuard). Opcional em desenvolvimento (sem ele o throttle
  // usa o IP da conexão); OBRIGATÓRIO em produção, senão o login fica com um balde único.
  @ValidateIf((o) => o.NODE_ENV === "production" || o.CLIENT_IP_SECRET !== undefined)
  @IsString()
  @MinLength(32)
  CLIENT_IP_SECRET?: string;

  // Cobrança (Stripe). Opcionais em desenvolvimento (as rotas de cobrança respondem 503 "cobrança não
  // configurada"); OBRIGATÓRIAS em produção (o boot falha). O prefixo é conferido para pegar chave
  // trocada (ex.: colar a chave pública no lugar da secreta).
  @ValidateIf((o) => o.NODE_ENV === "production" || o.STRIPE_SECRET_KEY !== undefined)
  @Matches(/^sk_(test|live)_[A-Za-z0-9]+$/)
  STRIPE_SECRET_KEY?: string;

  @ValidateIf((o) => o.NODE_ENV === "production" || o.STRIPE_WEBHOOK_SECRET !== undefined)
  @Matches(/^whsec_[A-Za-z0-9]+$/)
  STRIPE_WEBHOOK_SECRET?: string;

  // Price mensal de cada plano (criados no Stripe). O preço cobrado vem daqui, nunca do cliente.
  @ValidateIf((o) => o.NODE_ENV === "production" || o.STRIPE_PRICE_ESSENCIAL !== undefined)
  @Matches(/^price_[A-Za-z0-9]+$/)
  STRIPE_PRICE_ESSENCIAL?: string;

  @ValidateIf((o) => o.NODE_ENV === "production" || o.STRIPE_PRICE_PROFISSIONAL !== undefined)
  @Matches(/^price_[A-Za-z0-9]+$/)
  STRIPE_PRICE_PROFISSIONAL?: string;

  @ValidateIf((o) => o.NODE_ENV === "production" || o.STRIPE_PRICE_PREMIUM !== undefined)
  @Matches(/^price_[A-Za-z0-9]+$/)
  STRIPE_PRICE_PREMIUM?: string;
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
