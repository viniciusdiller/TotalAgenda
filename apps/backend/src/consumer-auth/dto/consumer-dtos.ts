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

  // Aceite explícito dos termos/privacidade — obrigatório (LGPD).
  @IsBoolean()
  consent!: boolean;
}

export class ConsumerLoginStartDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;
}

export class ConsumerLoginDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX)
  password!: string;
}

// Etapa de migração de conta antiga (só telefone): a pessoa cria a senha e informa e-mail.
export class ConsumerSetPasswordMigrationDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  password!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsBoolean()
  consent!: boolean;
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
