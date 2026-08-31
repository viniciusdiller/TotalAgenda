import { Controller, Get, Param, Query } from "@nestjs/common";
import { MarketplaceService } from "./marketplace.service";
import { Public } from "../common/decorators/public.decorator";

@Public()
@Controller("public/marketplace")
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get("categories")
  categories() {
    return this.marketplace.listCategories();
  }

  @Get("cities")
  cities() {
    return this.marketplace.listCities();
  }

  @Get("search")
  search(
    @Query("q") q?: string,
    @Query("city") city?: string,
    @Query("category") category?: string,
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("radiusKm") radiusKm?: string,
  ) {
    return this.marketplace.search({
      q,
      city,
      category,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
    });
  }

  @Get("establishments/:slug")
  establishment(@Param("slug") slug: string) {
    return this.marketplace.establishmentProfile(slug);
  }
}
