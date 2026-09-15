import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  costCents?: number;

  // Estoque inicial opcional — vira um StockMovement kind IN.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  initialStock?: number;
}
