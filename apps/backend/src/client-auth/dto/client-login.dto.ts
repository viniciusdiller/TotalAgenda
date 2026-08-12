import { IsString, MinLength } from "class-validator";

export class ClientLoginDto {
  @IsString()
  @MinLength(8)
  phone!: string;
}
