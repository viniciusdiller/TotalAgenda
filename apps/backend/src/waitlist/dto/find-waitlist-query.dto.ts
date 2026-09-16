import { IsEnum, IsOptional } from "class-validator";
import { WaitlistStatus } from "@totalagenda/database";

export class FindWaitlistQueryDto {
  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?: WaitlistStatus;
}
