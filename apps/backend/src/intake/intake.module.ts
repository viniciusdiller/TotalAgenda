import { Module } from "@nestjs/common";
import { IntakeService } from "./intake.service";
import { IntakeFormsController, IntakeResponsesController } from "./intake.controller";

@Module({
  controllers: [IntakeFormsController, IntakeResponsesController],
  providers: [IntakeService],
  exports: [IntakeService],
})
export class IntakeModule {}
