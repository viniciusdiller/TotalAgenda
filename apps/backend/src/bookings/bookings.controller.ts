import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { RescheduleBookingDto } from "./dto/reschedule-booking.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";

@Controller("public/tenants/:slug/bookings")
export class PublicBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(@Param("slug") slug: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createFromPublicLink(slug, dto);
  }
}

@Controller("public/bookings/:token")
export class PublicBookingManageController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Public()
  @Get()
  getByToken(@Param("token") token: string) {
    return this.bookingsService.findByToken(token);
  }

  @Public()
  @Patch("cancel")
  cancel(@Param("token") token: string) {
    return this.bookingsService.cancelByToken(token);
  }

  @Public()
  @Patch("reschedule")
  reschedule(@Param("token") token: string, @Body() dto: RescheduleBookingDto) {
    return this.bookingsService.rescheduleByToken(token, dto);
  }
}

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.bookingsService.findForAdmin(user, from, to);
  }
}
