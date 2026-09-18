import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateWaitlistEntryDto {
  @IsString()
  serviceId!: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
