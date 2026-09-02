import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateWaitlistEntryDto {
  @IsString()
  serviceId!: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  clientName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  clientPhone!: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
