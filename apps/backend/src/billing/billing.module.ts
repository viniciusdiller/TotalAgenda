import { Module } from "@nestjs/common";
import { PlanLimitService } from "./plan-limit.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  controllers: [BillingController],
  providers: [PlanLimitService, BillingService],
  exports: [PlanLimitService],
})
export class BillingModule {}
