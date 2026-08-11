import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateProfessionalDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
