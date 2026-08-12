import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateTenantProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessHours?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "Cor inválida. Use o formato #RRGGBB." })
  accentColor?: string;
}
