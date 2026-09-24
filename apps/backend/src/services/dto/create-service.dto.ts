import { Trim } from "../../common/decorators/trim.decorator";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Trim()
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  description?: string;

  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents!: number;
}
