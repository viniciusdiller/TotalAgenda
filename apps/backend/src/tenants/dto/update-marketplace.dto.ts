import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

// Configuração de listagem no marketplace (M5). Todos opcionais — PATCH parcial.
export class UpdateMarketplaceDto {
  @IsOptional()
  @IsBoolean()
  listedInMarketplace?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  neighborhood?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priceRange?: number;

  // Slugs das categorias (substitui o conjunto atual).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  categorySlugs?: string[];
}
