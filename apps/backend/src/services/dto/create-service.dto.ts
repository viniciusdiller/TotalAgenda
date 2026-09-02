import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsInt()
  @Min(5)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  priceCents!: number;
}
