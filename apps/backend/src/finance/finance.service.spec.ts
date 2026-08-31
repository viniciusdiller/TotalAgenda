import { BadRequestException } from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { PrismaService } from "../prisma/prisma.service";

function build(over: Record<string, unknown> = {}) {
  const prisma = {
    financialCategory: {
      findMany: jest.fn().mockResolvedValue([{ id: "c1" }]),
      findFirst: jest.fn().mockResolvedValue({ id: "c1", direction: "INCOME" }),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "c1", ...data })),
      createMany: jest.fn(),
    },
    financialEntry: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "e1", ...data })),
      update: jest.fn().mockImplementation(({ data }) => ({ id: "e1", ...data })),
    },
    stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
    commissionEntry: { groupBy: jest.fn().mockResolvedValue([]) },
    professional: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn().mockImplementation((arr) => Promise.all(arr)),
    ...over,
  } as unknown as PrismaService;
  return { service: new FinanceService(prisma), prisma };
}

const range = { from: "2026-08-01T00:00:00Z", to: "2026-08-31T23:59:59Z" };

describe("FinanceService", () => {
  it("listCategories cria os padrões quando não há nenhum", async () => {
    const prisma = build().prisma;
    (prisma.financialCategory.findMany as jest.Mock).mockResolvedValueOnce([]);
    const service = new FinanceService(prisma);
    await service.listCategories("t-1");
    expect(prisma.financialCategory.createMany).toHaveBeenCalled();
  });

  it("createEntry recusa categoria de direção divergente", async () => {
    const { service, prisma } = build();
    (prisma.financialCategory.findFirst as jest.Mock).mockResolvedValue({
      id: "c1",
      direction: "EXPENSE",
    });
    await expect(
      service.createEntry("t-1", "u-1", {
        direction: "INCOME",
        description: "x",
        amountCents: 100,
        dueDate: "2026-08-10",
        categoryId: "c1",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("createEntry com paidAt nasce PAID", async () => {
    const { service, prisma } = build();
    (prisma.financialCategory.findFirst as jest.Mock).mockResolvedValue(null);
    await service.createEntry("t-1", "u-1", {
      direction: "EXPENSE",
      description: "Aluguel",
      amountCents: 200000,
      dueDate: "2026-08-05",
      paidAt: "2026-08-05",
    });
    expect((prisma.financialEntry.create as jest.Mock).mock.calls[0][0].data.status).toBe("PAID");
  });

  it("settleEntry recusa lançamento já quitado", async () => {
    const { service, prisma } = build();
    (prisma.financialEntry.findFirst as jest.Mock).mockResolvedValue({ id: "e1", status: "PAID" });
    await expect(service.settleEntry("t-1", "e1", {})).rejects.toThrow(BadRequestException);
  });

  it("updateEntry recusa lançamento gerado pelo sistema", async () => {
    const { service, prisma } = build();
    (prisma.financialEntry.findFirst as jest.Mock).mockResolvedValue({
      id: "e1",
      source: "TICKET",
      status: "PAID",
    });
    await expect(service.updateEntry("t-1", "e1", { amountCents: 1 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("dre calcula receita - CMV - despesas", async () => {
    const { service, prisma } = build();
    (prisma.financialEntry.findMany as jest.Mock).mockResolvedValue([
      { direction: "INCOME", amountCents: 100000, category: { name: "Vendas" } },
      { direction: "EXPENSE", amountCents: 30000, category: { name: "Aluguel" } },
    ]);
    (prisma.stockMovement.findMany as jest.Mock).mockResolvedValue([
      { quantity: -2, product: { costCents: 5000 } },
    ]);

    const result = await service.dre("t-1", range.from, range.to);

    expect(result.revenueCents).toBe(100000);
    expect(result.cogsCents).toBe(10000);
    expect(result.grossProfitCents).toBe(90000);
    expect(result.resultCents).toBe(60000);
  });

  it("openItems marca vencidos e soma o atraso", async () => {
    const { service, prisma } = build();
    (prisma.financialEntry.findMany as jest.Mock).mockResolvedValue([
      { id: "a", description: "x", amountCents: 100, dueDate: new Date("2000-01-01"), category: null },
      { id: "b", description: "y", amountCents: 50, dueDate: new Date("2999-01-01"), category: null },
    ]);
    const result = await service.openItems("t-1", "EXPENSE");
    expect(result.totalCents).toBe(150);
    expect(result.overdueCents).toBe(100);
  });

  it("closeCommissions gera um lançamento por profissional", async () => {
    const { service, prisma } = build();
    (prisma.commissionEntry.groupBy as jest.Mock).mockResolvedValue([
      { professionalId: "p1", _sum: { amountCents: 30000 } },
      { professionalId: "p2", _sum: { amountCents: 12000 } },
    ]);
    (prisma.professional.findMany as jest.Mock).mockResolvedValue([
      { id: "p1", user: { name: "Alex" } },
      { id: "p2", user: { name: "Bruna" } },
    ]);

    const result = await service.closeCommissions("t-1", "u-1", {
      from: range.from,
      to: range.to,
      dueDate: "2026-09-05",
    });

    expect(result.created).toBe(2);
    expect(result.totalCents).toBe(42000);
  });

  it("closeCommissions sem comissão no período lança erro", async () => {
    const { service } = build();
    await expect(
      service.closeCommissions("t-1", "u-1", { from: range.from, to: range.to, dueDate: "2026-09-05" }),
    ).rejects.toThrow(BadRequestException);
  });
});
