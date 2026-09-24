import { IsBrazilianPhone } from "../../common/validators/br-validators";
import { Trim } from "../../common/decorators/trim.decorator";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
  IsUUID,
} from "class-validator";

class StaffAppointmentItemDto {
  @IsUUID()
  serviceId!: string;
}

// Agendamento criado pela recepção/dono (walk-in ou por telefone). Pode ter vários
// serviços em sequência e o cliente pode ser um já cadastrado (clientId) OU um cadastro
// rápido (clientName + clientPhone).
export class CreateStaffAppointmentDto {
  @IsUUID()
  professionalId!: string;

  @IsDateString()
  startAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => StaffAppointmentItemDto)
  items!: StaffAppointmentItemDto[];

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Trim()
  clientName?: string;

  @IsOptional()
  @IsBrazilianPhone()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  notes?: string;

  // SCHEDULED (default) = encaixe ainda não confirmado; CONFIRMED = já firme.
  @IsOptional()
  @IsIn(["SCHEDULED", "CONFIRMED"])
  status?: "SCHEDULED" | "CONFIRMED";
}
