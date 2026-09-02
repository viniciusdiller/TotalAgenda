import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Role } from "@totalagenda/database";
import { AppointmentsService } from "./appointments.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { CreateStaffAppointmentDto } from "./dto/create-staff-appointment.dto";
import { RescheduleAppointmentDto } from "./dto/reschedule-appointment.dto";
import { UpdateAppointmentStatusDto } from "./dto/update-appointment-status.dto";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";
import { ClientJwtAuthGuard } from "../client-auth/guards/client-jwt-auth.guard";
import { CurrentClient } from "../client-auth/decorators/current-client.decorator";
import { AuthenticatedClient } from "../client-auth/types/client-auth-user";
import { ClientAuthService } from "../client-auth/client-auth.service";

// Agendamento pelo link público do tenant. Caminho mantido em /bookings por
// compatibilidade com o wizard público do frontend.
@Controller("public/tenants/:slug/bookings")
export class PublicAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(@Param("slug") slug: string, @Body() dto: CreateAppointmentDto) {
    return this.appointments.createFromPublicLink(slug, dto);
  }
}

@Controller("public/bookings/:token")
export class PublicAppointmentManageController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Public()
  @Get()
  getByToken(@Param("token") token: string) {
    return this.appointments.findByToken(token);
  }

  // manageToken (nanoid 24) já é a credencial em si, mas sem throttle nada impede tentar
  // adivinhar/força-bruta em cima do espaço de tokens — mesmo limite usado na criação.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Patch("cancel")
  cancel(@Param("token") token: string) {
    return this.appointments.cancelByToken(token);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Patch("reschedule")
  reschedule(@Param("token") token: string, @Body() dto: RescheduleAppointmentDto) {
    return this.appointments.rescheduleByToken(token, dto);
  }
}

// Painel do dono/recepção. OWNER e RECEPTIONIST enxergam a agenda inteira;
// PROFESSIONAL só a própria (filtro aplicado no service).
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.appointments.findForAdmin(user, from, to);
  }

  @Get("calendar")
  calendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("professionalId") professionalId?: string,
  ) {
    return this.appointments.getCalendar(user, from, to, professionalId);
  }

  @Roles(Role.OWNER, Role.RECEPTIONIST, Role.PROFESSIONAL)
  @Post()
  createByStaff(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStaffAppointmentDto) {
    return this.appointments.createByStaff(user, dto);
  }

  @Roles(Role.OWNER, Role.RECEPTIONIST, Role.PROFESSIONAL)
  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointments.updateStatus(user, id, dto);
  }

  @Roles(Role.OWNER, Role.RECEPTIONIST, Role.PROFESSIONAL)
  @Patch(":id/cancel")
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.appointments.cancelByStaff(user, id);
  }

  @Roles(Role.OWNER, Role.RECEPTIONIST, Role.PROFESSIONAL)
  @Patch(":id/reschedule")
  reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointments.rescheduleByStaff(user, id, dto);
  }
}

// Área do cliente logado (login só por telefone, ver client-auth/). Protegida pelo
// ClientJwtAuthGuard local — @Public() pula a cadeia global de guards de staff.
@Controller("public/tenants/:slug/my-bookings")
export class ClientAppointmentsController {
  constructor(
    private readonly appointments: AppointmentsService,
    private readonly clientAuthService: ClientAuthService,
  ) {}

  @Public()
  @UseGuards(ClientJwtAuthGuard)
  @Get()
  async findMine(@Param("slug") slug: string, @CurrentClient() client: AuthenticatedClient) {
    const [clientInfo, bookings] = await Promise.all([
      this.clientAuthService.me(client),
      this.appointments.findForClient(slug, client),
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
    return this.appointments.cancelForClient(slug, id, client);
  }

  @Public()
  @UseGuards(ClientJwtAuthGuard)
  @Patch(":id/reschedule")
  rescheduleMine(
    @Param("slug") slug: string,
    @Param("id") id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentClient() client: AuthenticatedClient,
  ) {
    return this.appointments.rescheduleForClient(slug, id, dto, client);
  }
}
