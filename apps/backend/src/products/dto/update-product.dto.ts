import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
