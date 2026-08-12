import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { RescheduleBookingDto } from "./dto/reschedule-booking.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";
import { ClientJwtAuthGuard } from "../client-auth/guards/client-jwt-auth.guard";
import { CurrentClient } from "../client-auth/decorators/current-client.decorator";
import { AuthenticatedClient } from "../client-auth/types/client-auth-user";
import { ClientAuthService } from "../client-auth/client-auth.service";

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

// Área do cliente logado (login só por telefone, ver client-auth/). Protegida por
// ClientJwtAuthGuard, não pelo JwtAuthGuard de staff — por isso @Public() pula a cadeia
// global de guards e o acesso é controlado só pelo guard local.
@Controller("public/tenants/:slug/my-bookings")
export class ClientBookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly clientAuthService: ClientAuthService,
  ) {}

  @Public()
  @UseGuards(ClientJwtAuthGuard)
  @Get()
  async findMine(@Param("slug") slug: string, @CurrentClient() client: AuthenticatedClient) {
    const [clientInfo, bookings] = await Promise.all([
      this.clientAuthService.me(client),
      this.bookingsService.findForClient(slug, client),
    ]);
    return { client: clientInfo, bookings };
  }

  @Public()
  @UseGuards(ClientJwtAuthGuard)
  @Patch(":id/cancel")
  cancelMine(
    @Param("slug") slug: string,
    @Param("id") id: string,
    @CurrentClient() client: AuthenticatedClient,
  ) {
    return this.bookingsService.cancelForClient(slug, id, client);
  }

  @Public()
  @UseGuards(ClientJwtAuthGuard)
  @Patch(":id/reschedule")
  rescheduleMine(
    @Param("slug") slug: string,
    @Param("id") id: string,
    @Body() dto: RescheduleBookingDto,
    @CurrentClient() client: AuthenticatedClient,
  ) {
    return this.bookingsService.rescheduleForClient(slug, id, dto, client);
  }
}
