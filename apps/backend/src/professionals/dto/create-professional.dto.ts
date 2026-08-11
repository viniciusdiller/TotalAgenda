import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateProfessionalDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  initialPassword!: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
