import { Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export type SincronizacaoStatus = "ativa" | "cancelada" | "inadimplente";

export class PlanoLimitesDto {
  @IsOptional()
  @IsInt()
  maxProfessionals?: number | null;
}

export class PlanoDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanoLimitesDto)
  limites?: PlanoLimitesDto;
}

// DTO único para os dois eventos (mesma URL, campo `evento` diferencia o payload). Os
// campos específicos de cada evento ficam opcionais aqui; TotalsoftwareWebhookService
// valida a presença deles de acordo com o `evento` recebido.
export class TotalSoftwareWebhookDto {
  @IsIn(["provisionamento", "sincronizacao_status"])
  evento!: "provisionamento" | "sincronizacao_status";

  @IsString()
  @IsNotEmpty()
  webhookSecret!: string;

  @IsInt()
  clienteId!: number;

  // campos do evento "provisionamento"
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nomeEmpresa?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  responsavelNome?: string;

  @IsOptional()
  @IsEmail()
  responsavelEmail?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanoDto)
  plano?: PlanoDto;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stripeCustomerId?: string;

  // campos do evento "sincronizacao_status" (stripeSubscriptionId também é usado no
  // provisionamento)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stripeSubscriptionId?: string;

  @IsOptional()
  @IsIn(["ativa", "cancelada", "inadimplente"])
  status?: SincronizacaoStatus;

  @IsOptional()
  proximaCobranca?: string | null;
}
