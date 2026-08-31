import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Role } from "@totalagenda/database";
import { TicketsService } from "./tickets.service";
import {
  AddPaymentDto,
  AddTicketItemDto,
  OpenTicketDto,
  SetTicketDiscountDto,
} from "./dto/ticket-dtos";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";

@Roles(Role.OWNER, Role.RECEPTIONIST)
@Controller("tickets")
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  listOpen(@CurrentUser() user: AuthenticatedUser) {
    return this.tickets.findOpen(user.tenantId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tickets.get(user.tenantId, id);
  }

  @Post()
  open(@CurrentUser() user: AuthenticatedUser, @Body() dto: OpenTicketDto) {
    return this.tickets.open(user.tenantId, user.userId, dto);
  }

  @Post(":id/items")
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddTicketItemDto,
  ) {
    return this.tickets.addItem(user.tenantId, id, dto);
  }

  @Delete(":id/items/:itemId")
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.tickets.removeItem(user.tenantId, id, itemId);
  }

  @Patch(":id/discount")
  setDiscount(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SetTicketDiscountDto,
  ) {
    return this.tickets.setDiscount(user.tenantId, id, dto);
  }

  @Post(":id/payments")
  addPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddPaymentDto,
  ) {
    return this.tickets.addPayment(user.tenantId, id, dto);
  }

  @Post(":id/close")
  close(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tickets.close(user.tenantId, id);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tickets.cancel(user.tenantId, id);
  }
}
