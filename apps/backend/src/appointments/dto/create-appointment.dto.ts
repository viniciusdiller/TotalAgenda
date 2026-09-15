import { IsDateString, IsString, MaxLength, MinLength } from "class-validator";

// Agendamento pelo link público do tenant: sempre 1 serviço, cliente identificado por
// nome + telefone (a conta é criada/atualizada no upsert). Endpoint público SEM
// autenticação — os campos de texto livre precisam de teto (senão vira vetor de storage
// abuse: strings gigantes repetidas sem limite de tentativa nenhum além do throttle).
export class CreateAppointmentDto {
  @IsString()
  professionalId!: string;

  @IsString()
  serviceId!: string;

  @IsDateString()
  startAt!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  clientName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  clientPhone!: string;
}
