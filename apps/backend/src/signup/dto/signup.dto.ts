import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { NormalizeEmail } from "../../common/decorators/normalize-email.decorator";

const trim = () => Transform(({ value }) => (typeof value === "string" ? value.trim() : value));

// Todo campo aqui vem de um formulário público sem login: nada disso é confiável. Não há campo de
// plano, preço, papel, tenantId nem trial — o servidor define tudo isso (papel OWNER, trial
// TRIAL_DAYS, sem assinatura). `forbidNonWhitelisted` rejeita qualquer campo a mais.
export class SignupDto {
  @trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  businessName!: string;

  @trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  ownerName!: string;

  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // 72: o bcrypt só considera os primeiros 72 bytes; recusar acima disso evita a ilusão de que
  // uma senha longa foi toda usada.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
