import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Trim } from "../../common/decorators/trim.decorator";
import { IsBirthDate, IsBrazilianPhone, IsCpf } from "../../common/validators/br-validators";

// Cada tag: sem espaços nas bordas, sem vazias e com teto de tamanho/quantidade — sem isso um
// único PATCH gravava milhares de tags gigantes na linha do cliente.
export const MAX_CLIENT_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
export const CleanTags = () =>
  Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((t) => (typeof t === "string" ? t.trim() : t)).filter((t) => t !== "")
      : value,
  );

export class CreateClientDto {
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsBrazilianPhone()
  phone!: string;

  @IsOptional()
  @Trim()
  @ValidateIf((o) => !!o.email)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsBirthDate()
  birthDate?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.cpf)
  @IsCpf()
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @CleanTags()
  @IsArray()
  @ArrayMaxSize(MAX_CLIENT_TAGS)
  @IsString({ each: true })
  @MaxLength(MAX_TAG_LENGTH, { each: true })
  tags?: string[];
}
