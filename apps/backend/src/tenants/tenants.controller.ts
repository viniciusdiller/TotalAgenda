import { Controller, Get, Param } from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { Public } from "../common/decorators/public.decorator";
import { SkipBillingCheck } from "../common/decorators/skip-billing-check.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";

@Controller()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @SkipBillingCheck()
  @Get("tenants/me")
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Public()
  @Get("public/tenants/:slug")
  getPublicBySlug(@Param("slug") slug: string) {
    return this.tenantsService.findPublicBySlug(slug);
  }
}
