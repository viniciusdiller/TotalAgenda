import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class LinkProfessionalServiceDto {
  @IsString()
  serviceId!: string;

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
