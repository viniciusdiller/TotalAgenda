import { Trim } from "../../common/decorators/trim.decorator";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, IsUUID } from "class-validator";

export class CreateReviewDto {
  @IsUUID()
  appointmentId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  comment?: string;
}

export class ReportReviewDto {
  @IsString()
  @MaxLength(500)
  @Trim()
  reason!: string;
}
