import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpsertCommissionRuleDto {
  @IsString()
  professionalId!: string;

  @IsIn(["SERVICE", "PRODUCT", "ALL"])
  base!: "SERVICE" | "PRODUCT" | "ALL";

  // Obrigatório quando base != ALL: id do serviço ou produto alvo.
  @IsOptional()
  @IsString()
  targetId?: string;

  @IsIn(["PERCENT", "FIXED"])
  kind!: "PERCENT" | "FIXED";

  // PERCENT: 0–100 (pontos percentuais, checado no service). FIXED: centavos por item — sem
  // teto natural de 100 como PERCENT, por isso o @Max aqui (o service só valida PERCENT).
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  value!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
