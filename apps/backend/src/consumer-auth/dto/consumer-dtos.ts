import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterConsumerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  // Aceite explícito dos termos/privacidade — obrigatório (LGPD).
  @IsBoolean()
  consent!: boolean;
}

export class ConsumerLoginDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;
}
