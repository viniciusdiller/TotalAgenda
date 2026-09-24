import { BadRequestException } from "@nestjs/common";
import { CommissionsService } from "./commissions.service";
import { PrismaService } from "../prisma/prisma.service";

function txWith(rules: unknown[]) {
  const created: unknown[] = [];
  const tx = {
    commissionRule: { findMany: jest.fn().mockResolvedValue(rules) },
    commissionEntry: {
      createMany: jest.fn().mockImplementation(({ data }) => {
        created.push(...data);
        return { count: data.length };
      }),
    },
  };
  return { tx, created };
}

const service = new CommissionsService({} as unknown as PrismaService);

describe("CommissionsService.computeForTicket", () => {
  const item = (over: Record<string, unknown> = {}) => ({
    id: "it-1",
    kind: "SERVICE" as const,
    serviceId: "svc-1",
    productId: null,
    professionalId: "prof-1",
    quantity: 1,
    unitPriceCents: 10000,
    ...over,
  });

  it("PERCENT calcula sobre base (preço × qtd)", async () => {
    const { tx, created } = txWith([
      { id: "r1", professionalId: "prof-1", base: "ALL", targetId: null, kind: "PERCENT", value: 30 },
    ]);
    await service.computeForTicket(tx as never, "t-1", "tk-1", [item({ quantity: 2 })]);
    expect(created).toEqual([
      expect.objectContaining({ baseCents: 20000, amountCents: 6000, professionalId: "prof-1" }),
    ]);
  });

  it("FIXED multiplica pela quantidade", async () => {
    const { tx, created } = txWith([
      { id: "r1", professionalId: "prof-1", base: "PRODUCT", targetId: null, kind: "FIXED", value: 500 },
    ]);
    await service.computeForTicket(tx as never, "t-1", "tk-1", [
      item({ kind: "PRODUCT", serviceId: null, productId: "p-1", quantity: 3 }),
    ]);
    expect(created[0]).toMatchObject({ amountCents: 1500 });
  });

  it("regra com target exato vence a genérica", async () => {
    const { tx, created } = txWith([
      { id: "all", professionalId: "prof-1", base: "ALL", targetId: null, kind: "PERCENT", value: 10 },
      { id: "svc", professionalId: "prof-1", base: "SERVICE", targetId: "svc-1", kind: "PERCENT", value: 50 },
    ]);
    await service.computeForTicket(tx as never, "t-1", "tk-1", [item()]);
    expect(created[0]).toMatchObject({ amountCents: 5000 });
  });

  it("item sem profissional não gera comissão", async () => {
    const { tx, created } = txWith([
      { id: "r1", professionalId: "prof-1", base: "ALL", targetId: null, kind: "PERCENT", value: 30 },
    ]);
    await service.computeForTicket(tx as never, "t-1", "tk-1", [item({ professionalId: null })]);
    expect(created).toHaveLength(0);
  });

  it("sem regra que case, nada é criado", async () => {
    const { tx, created } = txWith([
      { id: "r1", professionalId: "prof-1", base: "PRODUCT", targetId: null, kind: "PERCENT", value: 30 },
    ]);
    await service.computeForTicket(tx as never, "t-1", "tk-1", [item()]);
    expect(created).toHaveLength(0);
  });
});

describe("CommissionsService.report", () => {
  // Regressão: sem teto de intervalo, "1970 → 2100" materializava todas as comissões do tenant.
  it("recusa intervalo maior que o teto do relatório, sem consultar o banco", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new CommissionsService({ commissionEntry: { findMany } } as unknown as PrismaService);

    await expect(
      svc.report("t-1", "1970-01-01T00:00:00Z", "2100-01-01T00:00:00Z"),
    ).rejects.toThrow(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("aceita um intervalo anual e sempre filtra por tenantId", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new CommissionsService({ commissionEntry: { findMany } } as unknown as PrismaService);

    await svc.report("t-1", "2026-01-01T00:00:00Z", "2026-12-31T00:00:00Z", "prof-1");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "t-1", professionalId: "prof-1" }),
      }),
    );
  });
});

// Regressão: `targetId` vinha do body sem checar o tenant, então uma regra podia apontar para um
// serviço/produto de OUTRO negócio. Agora o alvo tem que existir no tenant do JWT.
describe("CommissionsService.createRule: alvo da regra", () => {
  const dto = (over: Record<string, unknown> = {}) =>
    ({
      professionalId: "prof-1",
      base: "SERVICE",
      targetId: "svc-de-outro-tenant",
      kind: "PERCENT",
      value: 10,
      ...over,
    }) as never;

  const build = (found: { service?: unknown; product?: unknown }) => {
    const prisma = {
      professional: { findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }) },
      service: { findFirst: jest.fn().mockResolvedValue(found.service ?? null) },
      product: { findFirst: jest.fn().mockResolvedValue(found.product ?? null) },
      commissionRule: { create: jest.fn().mockResolvedValue({ id: "r1" }) },
    };
    return { prisma, svc: new CommissionsService(prisma as unknown as PrismaService) };
  };

  it("recusa serviço de outro tenant (a busca leva o tenantId no WHERE)", async () => {
    const { prisma, svc } = build({});
    await expect(svc.createRule("tenant-A", dto())).rejects.toThrow("Serviço não encontrado.");
    expect(prisma.service.findFirst).toHaveBeenCalledWith({
      where: { id: "svc-de-outro-tenant", tenantId: "tenant-A" },
      select: { id: true },
    });
    expect(prisma.commissionRule.create).not.toHaveBeenCalled();
  });

  it("recusa produto de outro tenant", async () => {
    const { prisma, svc } = build({});
    await expect(svc.createRule("tenant-A", dto({ base: "PRODUCT" }))).rejects.toThrow("Produto não encontrado.");
    expect(prisma.commissionRule.create).not.toHaveBeenCalled();
  });

  it("aceita alvo do próprio tenant e regra ALL (sem alvo)", async () => {
    const own = build({ service: { id: "svc-1" } });
    await expect(own.svc.createRule("tenant-A", dto({ targetId: "svc-1" }))).resolves.toBeDefined();
    const all = build({});
    await expect(all.svc.createRule("tenant-A", dto({ base: "ALL", targetId: undefined }))).resolves.toBeDefined();
    expect(all.prisma.service.findFirst).not.toHaveBeenCalled();
  });
});
