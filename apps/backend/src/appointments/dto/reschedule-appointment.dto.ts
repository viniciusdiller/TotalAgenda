import { IsDateString, IsOptional, IsString, IsUUID } from "class-validator";

export class RescheduleAppointmentDto {
  @IsDateString()
  startAt!: string;

  // Opcional: remarcar trocando de profissional. Ausente = mantém o atual.
  @IsOptional()
  @IsUUID()
  professionalId?: string;
}
