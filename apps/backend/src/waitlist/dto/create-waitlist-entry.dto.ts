import { Trim } from "../../common/decorators/trim.decorator";
import { IsDateString, IsOptional, IsString, MaxLength, IsUUID } from "class-validator";

export class CreateWaitlistEntryDto {
  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  notes?: string;
}
