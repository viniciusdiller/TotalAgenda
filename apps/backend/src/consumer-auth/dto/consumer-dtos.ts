import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

// 72 = limite de entrada do bcrypt (bytes além disso são ignorados silenciosamente, então
// senha mais longa daria falsa sensação de segurança).
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

export class RegisterConsumerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  password!: string;

  // Aceite explícito dos termos/privacidade — obrigatório (LGPD). Este DTO também reivindica
  // conta antiga (telefone que já tinha cadastro sem senha): ver ConsumerAuthService.register.
  @IsBoolean()
  consent!: boolean;
}

// Telefone ou e-mail. Sem @IsEmail/regra de telefone de propósito: um formato inválido tem que
// cair no mesmo 401 genérico de "senha errada", não num 400 que diferencia os casos.
export class ConsumerLoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  identifier!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX)
  password!: string;
}

export class UpdateConsumerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

export class ChangeConsumerPasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX)
  currentPassword!: string;

  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  newPassword!: string;
}
