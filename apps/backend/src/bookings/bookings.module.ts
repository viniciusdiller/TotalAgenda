import { Module } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import {
  BookingsController,
  PublicBookingsController,
  PublicBookingManageController,
} from "./bookings.controller";

@Module({
  controllers: [BookingsController, PublicBookingsController, PublicBookingManageController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
