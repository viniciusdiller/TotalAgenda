import { IsDateString, IsOptional, IsString } from "class-validator";

export class RescheduleBookingDto {
  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsString()
  professionalId?: string;
}
