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
