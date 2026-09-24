import { Trim } from "../../common/decorators/trim.decorator";
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { NormalizeEmail } from "../../common/decorators/normalize-email.decorator";

export class UpdateProfessionalDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Trim()
  name?: string;

  @IsOptional()
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  bio?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
