import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Role } from "@totalagenda/database";
import { FinanceService } from "./finance.service";
import {
  CloseCommissionsDto,
  CreateCategoryDto,
  CreateEntryDto,
  SettleEntryDto,
  UpdateCategoryDto,
  UpdateEntryDto,
} from "./dto/finance-dtos";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";

// PROFESSIONAL não acessa o financeiro; RECEPTIONIST lança e dá baixa; OWNER tudo.
@Roles(Role.OWNER, Role.RECEPTIONIST)
@Controller("finance")
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("overview")
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.finance.overview(user.tenantId);
  }

  @Get("categories")
  listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.finance.listCategories(user.tenantId);
  }

  @Roles(Role.OWNER)
  @Post("categories")
  createCategory(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    return this.finance.createCategory(user.tenantId, dto);
  }

  @Roles(Role.OWNER)
  @Patch("categories/:id")
  updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.finance.updateCategory(user.tenantId, id, dto);
  }

  @Get("entries")
  listEntries(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("direction") direction?: string,
    @Query("status") status?: string,
    @Query("basis") basis?: string,
  ) {
    return this.finance.listEntries(user.tenantId, { from, to, direction, status, basis });
  }

  @Post("entries")
  createEntry(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEntryDto) {
    return this.finance.createEntry(user.tenantId, user.userId, dto);
  }

  @Patch("entries/:id")
  updateEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateEntryDto,
  ) {
    return this.finance.updateEntry(user.tenantId, id, dto);
  }

  @Post("entries/:id/settle")
  settleEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SettleEntryDto,
  ) {
    return this.finance.settleEntry(user.tenantId, id, dto);
  }

  @Post("entries/:id/cancel")
  cancelEntry(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.finance.cancelEntry(user.tenantId, id);
  }

  @Roles(Role.OWNER)
  @Post("commissions/close")
  closeCommissions(@CurrentUser() user: AuthenticatedUser, @Body() dto: CloseCommissionsDto) {
    return this.finance.closeCommissions(user.tenantId, user.userId, dto);
  }

  @Get("cash-flow")
  cashFlow(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("basis") basis?: string,
  ) {
    return this.finance.cashFlow(user.tenantId, from, to, basis === "due" ? "due" : "paid");
  }

  @Roles(Role.OWNER)
  @Get("dre")
  dre(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.finance.dre(user.tenantId, from, to);
  }

  @Get("payables")
  payables(@CurrentUser() user: AuthenticatedUser) {
    return this.finance.openItems(user.tenantId, "EXPENSE");
  }

  @Get("receivables")
  receivables(@CurrentUser() user: AuthenticatedUser) {
    return this.finance.openItems(user.tenantId, "INCOME");
  }
}
