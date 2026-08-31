import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;

  // Estoque inicial opcional — vira um StockMovement kind IN.
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;
}
