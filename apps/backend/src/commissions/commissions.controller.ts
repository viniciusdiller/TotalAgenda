import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Role } from "@totalagenda/database";
import { CommissionsService } from "./commissions.service";
import { UpsertCommissionRuleDto } from "./dto/upsert-commission-rule.dto";
import { RangeByProfessionalQueryDto } from "../common/dto/query-dtos";
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

  // PROFESSIONAL vê só o próprio; OWNER/RECEPTIONIST veem todos. O filtro é forçado dentro
  // do CommissionsService.report (não aqui), pra valer mesmo se outro caller chamar o
  // service direto no futuro.
  @Get("report")
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RangeByProfessionalQueryDto,
  ) {
    return this.commissions.report(user.tenantId, query.from, query.to, query.professionalId, {
      role: user.role,
      professionalId: user.professionalId,
    });
  }
}
