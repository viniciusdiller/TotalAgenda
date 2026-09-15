import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
