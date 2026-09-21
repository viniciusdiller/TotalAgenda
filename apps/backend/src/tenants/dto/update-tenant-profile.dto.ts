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

  // Vira href numa página PÚBLICA: só http(s) com protocolo explícito. Sem isso um esquema como
  // javascript: virava XSS armazenado no perfil do salão.
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ["http", "https"], require_protocol: true })
  @MaxLength(300)
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
