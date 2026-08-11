import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(5)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  priceCents!: number;
}
