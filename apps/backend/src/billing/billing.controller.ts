import { BadRequestException, Body, Controller, Get, Headers, Patch, Post, Query, RawBodyRequest, Req } from "@nestjs/common";
import { Request } from "express";
import { Role } from "@totalagenda/database";
import { BillingService } from "./billing.service";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { ChangePlanDto } from "./dto/change-plan.dto";
import { Public } from "../common/decorators/public.decorator";
import { SkipBillingCheck } from "../common/decorators/skip-billing-check.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Get("plans")
  listPlans() {
    return this.billingService.listPlans();
  }

  @SkipBillingCheck()
  @Get("billing/status")
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getTenantBillingStatus(user.tenantId);
  }

  @Roles(Role.OWNER)
  @SkipBillingCheck()
  @Post("billing/checkout-session")
  createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.billingService.createCheckoutSession(user.tenantId, dto);
  }

  @Roles(Role.OWNER)
  @SkipBillingCheck()
  @Post("billing/portal-session")
  createPortalSession(@CurrentUser() user: AuthenticatedUser, @Query("returnUrl") returnUrl: string) {
    return this.billingService.createPortalSession(user.tenantId, returnUrl);
  }

  @Roles(Role.OWNER)
  @SkipBillingCheck()
  @Patch("billing/plan")
  changePlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePlanDto) {
    return this.billingService.changePlan(user.tenantId, dto);
  }

  @Public()
  @Post("billing/webhook")
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException("Corpo bruto da requisição ausente.");
    }
    return this.billingService.handleWebhookEvent(req.rawBody, signature);
  }
}
