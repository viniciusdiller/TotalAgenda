import { Module } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import {
  BookingsController,
  PublicBookingsController,
  PublicBookingManageController,
  ClientBookingsController,
} from "./bookings.controller";
import { ClientsModule } from "../clients/clients.module";
import { ClientAuthModule } from "../client-auth/client-auth.module";

@Module({
  imports: [ClientsModule, ClientAuthModule],
  controllers: [
    BookingsController,
    PublicBookingsController,
    PublicBookingManageController,
    ClientBookingsController,
  ],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
