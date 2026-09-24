import { Trim } from "../../common/decorators/trim.decorator";
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { NormalizeEmail } from "../../common/decorators/normalize-email.decorator";

export class CreateProfessionalDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Trim()
  name!: string;

  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  initialPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  bio?: string;
}
