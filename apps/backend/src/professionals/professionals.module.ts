import { Module } from "@nestjs/common";
import { ProfessionalsService } from "./professionals.service";
import { ProfessionalsController, PublicProfessionalsController } from "./professionals.controller";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [BillingModule],
  controllers: [ProfessionalsController, PublicProfessionalsController],
  providers: [ProfessionalsService],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
