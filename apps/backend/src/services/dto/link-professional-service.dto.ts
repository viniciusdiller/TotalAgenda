import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class LinkProfessionalServiceDto {
  @IsString()
  serviceId!: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
