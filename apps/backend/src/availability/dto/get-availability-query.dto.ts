import { IsDateString, IsString } from "class-validator";

export class GetAvailabilityQueryDto {
  @IsString()
  serviceId!: string;

  @IsDateString({ strict: true }, { message: "date deve estar no formato YYYY-MM-DD" })
  date!: string;
}
