import { IsObject, IsOptional, IsString } from "class-validator";

export class SubmitIntakeResponseDto {
  @IsString()
  formId!: string;

  @IsString()
  clientId!: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  // { [fieldKey]: string | boolean }. Validado contra os campos do form no service.
  @IsObject()
  answers!: Record<string, unknown>;
}
