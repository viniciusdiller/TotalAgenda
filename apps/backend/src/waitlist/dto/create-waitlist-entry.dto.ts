import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateWaitlistEntryDto {
  @IsString()
  serviceId!: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsString()
  @MinLength(2)
  clientName!: string;

  @IsString()
  @MinLength(8)
  clientPhone!: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
