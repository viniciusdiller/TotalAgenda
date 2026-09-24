import { IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class SubmitIntakeResponseDto {
  @IsUUID()
  formId!: string;

  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  // { [fieldKey]: string | boolean }. Validado contra os campos do form no service.
  @IsObject()
  answers!: Record<string, unknown>;
}
