import { Module } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import {
  AppointmentsController,
  PublicAppointmentsController,
  PublicAppointmentManageController,
  ConsumerAppointmentsController,
} from "./appointments.controller";
import { ClientsModule } from "../clients/clients.module";
import { ConsumerAuthModule } from "../consumer-auth/consumer-auth.module";

@Module({
  imports: [ClientsModule, ConsumerAuthModule],
  controllers: [
    AppointmentsController,
    PublicAppointmentsController,
    PublicAppointmentManageController,
    ConsumerAppointmentsController,
  ],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
