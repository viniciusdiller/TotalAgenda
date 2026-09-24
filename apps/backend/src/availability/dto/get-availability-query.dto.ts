import { IsDateString, IsString, IsUUID } from "class-validator";

export class GetAvailabilityQueryDto {
  @IsUUID()
  serviceId!: string;

  @IsDateString({ strict: true }, { message: "date deve estar no formato YYYY-MM-DD" })
  date!: string;
}
