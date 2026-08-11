import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { Role } from "@totalagenda/database";
import { ProfessionalsService } from "./professionals.service";
import { CreateProfessionalDto } from "./dto/create-professional.dto";
import { UpdateProfessionalDto } from "./dto/update-professional.dto";
import { SetWorkingHoursDto } from "./dto/set-working-hours.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/auth-user";

@Controller("professionals")
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Roles(Role.OWNER)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.professionalsService.findAllByTenant(user.tenantId);
  }

  @Roles(Role.OWNER)
  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.update(user.tenantId, id, dto);
  }

  @Put(":id/working-hours")
  setWorkingHours(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SetWorkingHoursDto,
  ) {
    if (user.role === Role.PROFESSIONAL && user.professionalId !== id) {
      throw new ForbiddenException("Você só pode editar os próprios horários.");
    }
    return this.professionalsService.setWorkingHours(user.tenantId, id, dto);
  }
}

@Controller("public/tenants/:slug/professionals")
export class PublicProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Public()
  @Get()
  findPublic(@Param("slug") slug: string, @Query("serviceId") serviceId: string) {
    return this.professionalsService.findPublicByTenantSlugAndService(slug, serviceId);
  }
}
