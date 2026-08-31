import { IsDateString, IsString, MinLength } from "class-validator";

// Agendamento pelo link público do tenant: sempre 1 serviço, cliente identificado por
// nome + telefone (a conta é criada/atualizada no upsert).
export class CreateAppointmentDto {
  @IsString()
  professionalId!: string;

  @IsString()
  serviceId!: string;

  @IsDateString()
  startAt!: string;

  @IsString()
  @MinLength(2)
  clientName!: string;

  @IsString()
  @MinLength(8)
  clientPhone!: string;
}
