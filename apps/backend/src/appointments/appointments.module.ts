import { Module } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import {
  AppointmentsController,
  PublicAppointmentsController,
  PublicAppointmentManageController,
  ClientAppointmentsController,
} from "./appointments.controller";
import { ClientsModule } from "../clients/clients.module";
import { ClientAuthModule } from "../client-auth/client-auth.module";

@Module({
  imports: [ClientsModule, ClientAuthModule],
  controllers: [
    AppointmentsController,
    PublicAppointmentsController,
    PublicAppointmentManageController,
    ClientAppointmentsController,
  ],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
