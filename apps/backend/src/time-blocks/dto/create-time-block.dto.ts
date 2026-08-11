import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateTimeBlockDto {
  @IsString()
  professionalId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
