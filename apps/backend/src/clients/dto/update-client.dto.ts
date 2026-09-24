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
import { CleanTags, MAX_CLIENT_TAGS, MAX_TAG_LENGTH } from "./create-client.dto";

// `null` limpa o campo (o formulário manda null quando o campo fica em branco).
export class UpdateClientDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBrazilianPhone()
  phone?: string;

  @IsOptional()
  @Trim()
  @ValidateIf((o) => !!o.email)
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @IsOptional()
  @IsBirthDate()
  birthDate?: string | null;

  @IsOptional()
  @ValidateIf((o) => !!o.cpf)
  @IsCpf()
  cpf?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @CleanTags()
  @IsArray()
  @ArrayMaxSize(MAX_CLIENT_TAGS)
  @IsString({ each: true })
  @MaxLength(MAX_TAG_LENGTH, { each: true })
  tags?: string[];
}
