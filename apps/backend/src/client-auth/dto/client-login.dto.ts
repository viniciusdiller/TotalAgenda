import { IsString, MaxLength, MinLength } from "class-validator";

export class ClientLoginDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;
}
