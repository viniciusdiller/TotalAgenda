import { IsBoolean, IsOptional, IsString, IsUrl, Matches, MaxLength } from "class-validator";

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

  @IsOptional()
  @Matches(/^\d{10,15}$/, { message: "Telefone inválido. Use só dígitos, com DDI (ex: 5511912345678)." })
  whatsappNumber?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  instagramUrl?: string;

  @IsOptional()
  @IsBoolean()
  showServices?: boolean;

  @IsOptional()
  @IsBoolean()
  showTeam?: boolean;

  @IsOptional()
  @IsBoolean()
  showGallery?: boolean;

  @IsOptional()
  @IsBoolean()
  showContact?: boolean;
}
