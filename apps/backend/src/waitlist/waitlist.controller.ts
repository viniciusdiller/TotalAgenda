import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Role, WaitlistStatus } from "@totalagenda/database";
import { WaitlistService } from "./waitlist.service";
import { CreateWaitlistEntryDto } from "./dto/create-waitlist-entry.dto";
import { UpdateWaitlistStatusDto } from "./dto/update-waitlist-status.dto";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";

@Controller("public/tenants/:slug/waitlist")
export class PublicWaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Public()
  @Post()
  create(@Param("slug") slug: string, @Body() dto: CreateWaitlistEntryDto) {
    return this.waitlistService.createFromPublicLink(slug, dto);
  }
}

@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Roles(Role.OWNER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: WaitlistStatus) {
    return this.waitlistService.findAllByTenant(user.tenantId, status);
  }

  @Roles(Role.OWNER)
  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateWaitlistStatusDto,
  ) {
    return this.waitlistService.updateStatus(user.tenantId, id, dto.status);
  }
}
