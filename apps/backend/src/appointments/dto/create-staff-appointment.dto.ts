import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

class StaffAppointmentItemDto {
  @IsString()
  serviceId!: string;
}

// Agendamento criado pela recepção/dono (walk-in ou por telefone). Pode ter vários
// serviços em sequência e o cliente pode ser um já cadastrado (clientId) OU um cadastro
// rápido (clientName + clientPhone).
export class CreateStaffAppointmentDto {
  @IsString()
  professionalId!: string;

  @IsDateString()
  startAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StaffAppointmentItemDto)
  items!: StaffAppointmentItemDto[];

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  clientName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  clientPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // SCHEDULED (default) = encaixe ainda não confirmado; CONFIRMED = já firme.
  @IsOptional()
  @IsIn(["SCHEDULED", "CONFIRMED"])
  status?: "SCHEDULED" | "CONFIRMED";
}
