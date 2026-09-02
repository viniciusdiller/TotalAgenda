import { Controller, Get, Param, Query } from "@nestjs/common";
import { MarketplaceService } from "./marketplace.service";
import { Public } from "../common/decorators/public.decorator";
import { SearchMarketplaceQueryDto } from "./dto/search-marketplace-query.dto";

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
  search(@Query() query: SearchMarketplaceQueryDto) {
    return this.marketplace.search(query);
  }

  @Get("establishments/:slug")
  establishment(@Param("slug") slug: string) {
    return this.marketplace.establishmentProfile(slug);
  }
}
