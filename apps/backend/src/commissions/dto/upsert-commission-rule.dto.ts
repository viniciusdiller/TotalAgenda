import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

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

  // PERCENT: 0–100 (pontos percentuais). FIXED: centavos por item.
  @IsInt()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
