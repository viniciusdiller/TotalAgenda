import { IsEnum } from "class-validator";
import { PlanTier } from "@totalagenda/database";

export class ChangePlanDto {
  @IsEnum(PlanTier)
  tier!: PlanTier;
}
