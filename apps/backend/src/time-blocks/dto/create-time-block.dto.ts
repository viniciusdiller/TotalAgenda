import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateTimeBlockDto {
  @IsString()
  professionalId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
