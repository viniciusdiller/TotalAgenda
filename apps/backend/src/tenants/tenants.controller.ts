import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@totalagenda/database";
import { TenantsService } from "./tenants.service";
import { UpdateTenantProfileDto } from "./dto/update-tenant-profile.dto";
import { Public } from "../common/decorators/public.decorator";
import { SkipBillingCheck } from "../common/decorators/skip-billing-check.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";

const MAX_LOGO_UPLOAD_BYTES = 5 * 1024 * 1024;

@Controller()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @SkipBillingCheck()
  @Get("tenants/me")
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Roles(Role.OWNER)
  @SkipBillingCheck()
  @Patch("tenants/me")
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateTenantProfileDto) {
    return this.tenantsService.updateProfile(user.tenantId, dto);
  }

  @Roles(Role.OWNER)
  @SkipBillingCheck()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_LOGO_UPLOAD_BYTES } }))
  @Post("tenants/me/logo")
  uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tenantsService.updateLogo(user.tenantId, file);
  }

  @Roles(Role.OWNER)
  @SkipBillingCheck()
  @Delete("tenants/me/logo")
  removeLogo(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.removeLogo(user.tenantId);
  }

  @Public()
  @Get("public/tenants/:slug")
  getPublicBySlug(@Param("slug") slug: string) {
    return this.tenantsService.findPublicBySlug(slug);
  }
}
