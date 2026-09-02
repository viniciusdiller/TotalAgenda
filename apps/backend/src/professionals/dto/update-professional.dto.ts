import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProfessionalDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
