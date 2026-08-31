import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Role } from "@totalagenda/database";
import { CommissionsService } from "./commissions.service";
import { UpsertCommissionRuleDto } from "./dto/upsert-commission-rule.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";

@Controller("commissions")
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Roles(Role.OWNER)
  @Get("rules")
  listRules(@CurrentUser() user: AuthenticatedUser) {
    return this.commissions.listRules(user.tenantId);
  }

  @Roles(Role.OWNER)
  @Post("rules")
  createRule(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertCommissionRuleDto) {
    return this.commissions.createRule(user.tenantId, dto);
  }

  @Roles(Role.OWNER)
  @Patch("rules/:id")
  updateRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpsertCommissionRuleDto,
  ) {
    return this.commissions.updateRule(user.tenantId, id, dto);
  }

  // PROFESSIONAL vê só o próprio (filtro forçado); OWNER/RECEPTIONIST veem todos.
  @Get("report")
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("professionalId") professionalId?: string,
  ) {
    const scoped = user.role === Role.PROFESSIONAL ? user.professionalId : professionalId;
    return this.commissions.report(user.tenantId, from, to, scoped);
  }
}
