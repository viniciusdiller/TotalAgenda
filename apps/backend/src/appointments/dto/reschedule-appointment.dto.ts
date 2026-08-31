import { IsDateString, IsOptional, IsString } from "class-validator";

export class RescheduleAppointmentDto {
  @IsDateString()
  startAt!: string;

  // Opcional: remarcar trocando de profissional. Ausente = mantém o atual.
  @IsOptional()
  @IsString()
  professionalId?: string;
}
