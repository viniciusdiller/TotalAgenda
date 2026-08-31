import { NotFoundException } from "@nestjs/common";
import { MarketplaceService } from "./marketplace.service";
import { PrismaService } from "../prisma/prisma.service";

function build(over: Record<string, unknown> = {}) {
  const prisma = {
    serviceCategory: { findMany: jest.fn().mockResolvedValue([]) },
    tenant: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    review: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([]) },
    ...over,
  } as unknown as PrismaService;
  return { service: new MarketplaceService(prisma), prisma };
}

const tenantRow = (over: Record<string, unknown> = {}) => ({
  id: "t-1",
  name: "Salão A",
  slug: "salao-a",
  description: null,
  city: "São Paulo",
  neighborhood: "Centro",
  priceRange: 2,
  logoUrl: null,
  latitude: -23.55,
  longitude: -46.63,
  categories: [{ category: { name: "Barbearia", slug: "barbearia" } }],
  ...over,
});

describe("MarketplaceService.search", () => {
  it("ordena por distância quando lat/lng são passados", async () => {
    const { service, prisma } = build();
    (prisma.tenant.findMany as jest.Mock).mockResolvedValue([
      tenantRow({ id: "far", latitude: -23.7, longitude: -46.8 }),
      tenantRow({ id: "near", latitude: -23.551, longitude: -46.631 }),
    ]);

    const results = await service.search({ lat: -23.55, lng: -46.63 });

    expect(results[0].id).toBe("near");
    expect(results[0].distanceKm).toBeGreaterThanOrEqual(0);
  });

  it("sem geo, ordena por nota média", async () => {
    const { service, prisma } = build();
    (prisma.tenant.findMany as jest.Mock).mockResolvedValue([
      tenantRow({ id: "a" }),
      tenantRow({ id: "b" }),
    ]);
    (prisma.review.groupBy as jest.Mock).mockResolvedValue([
      { tenantId: "a", _avg: { rating: 3 }, _count: { _all: 2 } },
      { tenantId: "b", _avg: { rating: 4.8 }, _count: { _all: 9 } },
    ]);

    const results = await service.search({});

    expect(results[0].id).toBe("b");
    expect(results[0].rating.average).toBe(4.8);
  });

  it("aplica filtro de categoria no where", async () => {
    const { service, prisma } = build();
    await service.search({ category: "barbearia" });
    const where = (prisma.tenant.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.categories.some.category.slug).toBe("barbearia");
    expect(where.listedInMarketplace).toBe(true);
  });

  it("establishmentProfile lança NotFound se não listado", async () => {
    const { service, prisma } = build();
    (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.establishmentProfile("x")).rejects.toThrow(NotFoundException);
  });
});
