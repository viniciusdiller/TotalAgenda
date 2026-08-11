import { IsEnum } from "class-validator";
import { WaitlistStatus } from "@totalagenda/database";

export class UpdateWaitlistStatusDto {
  @IsEnum(WaitlistStatus)
  status!: WaitlistStatus;
}
