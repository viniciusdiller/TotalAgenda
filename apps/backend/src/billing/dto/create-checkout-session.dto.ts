import { IsEnum, IsUrl } from "class-validator";
import { PlanTier } from "@totalagenda/database";

export class CreateCheckoutSessionDto {
  @IsEnum(PlanTier)
  tier!: PlanTier;

  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}
