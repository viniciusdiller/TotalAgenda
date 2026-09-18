import { IsDateString, IsString } from "class-validator";

// Agendamento pelo link público do tenant: sempre 1 serviço. Quem agenda NÃO vem do body — a
// identidade é a do Consumer autenticado (ConsumerJwtAuthGuard), e o Client do tenant é
// derivado dela no service. Nenhum campo de nome/telefone existe aqui de propósito.
export class CreateAppointmentDto {
  @IsString()
  professionalId!: string;

  @IsString()
  serviceId!: string;

  @IsDateString()
  startAt!: string;
}
