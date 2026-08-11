import { Module } from "@nestjs/common";
import { ServicesService } from "./services.service";
import {
  ServicesController,
  ProfessionalServicesController,
  PublicServicesController,
} from "./services.controller";

@Module({
  controllers: [ServicesController, ProfessionalServicesController, PublicServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
