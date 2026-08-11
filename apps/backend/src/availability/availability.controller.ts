import { Controller, Get, Param, Query } from "@nestjs/common";
import { AvailabilityService } from "./availability.service";
import { GetAvailabilityQueryDto } from "./dto/get-availability-query.dto";
import { Public } from "../common/decorators/public.decorator";

@Controller("public/tenants/:slug/professionals/:professionalId/availability")
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Public()
  @Get()
  getAvailability(
    @Param("slug") slug: string,
    @Param("professionalId") professionalId: string,
    @Query() query: GetAvailabilityQueryDto,
  ) {
    return this.availabilityService.getAvailableSlots(
      slug,
      professionalId,
      query.serviceId,
      query.date,
    );
  }
}
