import { Trim } from "../../common/decorators/trim.decorator";
import { IsDateString, IsOptional, IsString, MaxLength, IsUUID } from "class-validator";

export class CreateTimeBlockDto {
  @IsUUID()
  professionalId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Trim()
  reason?: string;
}
