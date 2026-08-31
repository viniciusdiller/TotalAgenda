import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterConsumerDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Aceite explícito dos termos/privacidade — obrigatório (LGPD).
  @IsBoolean()
  consent!: boolean;
}

export class ConsumerLoginDto {
  @IsString()
  @MinLength(8)
  phone!: string;
}
