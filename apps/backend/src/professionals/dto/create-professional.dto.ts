import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProfessionalDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  initialPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
