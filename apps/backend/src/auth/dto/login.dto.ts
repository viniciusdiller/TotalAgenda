import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { NormalizeEmail } from "../../common/decorators/normalize-email.decorator";

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
