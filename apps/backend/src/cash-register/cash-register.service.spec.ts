import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { CashRegisterService } from "./cash-register.service";
import { PrismaService } from "../prisma/prisma.service";

function build(over: Record<string, unknown> = {}) {
  const prisma = {
    cashRegister: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "cr-1", ...data })),
      update: jest.fn().mockImplementation(({ data }) => ({ id: "cr-1", ...data })),
    },
    cashMovement: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "m-1", ...data })),
    },
    payment: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 0 } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(prismaTx)),
    ...over,
  } as unknown as PrismaService;
  const prismaTx = {
    cashRegister: { create: jest.fn().mockImplementation(({ data }) => ({ id: "cr-1", ...data })) },
    cashMovement: { create: jest.fn() },
  };
  return { service: new CashRegisterService(prisma), prisma, prismaTx };
}

describe("CashRegisterService", () => {
  // Regressão de isolamento: currentOpen é o único ponto que filtra por tenantId (os
  // outros métodos operam sobre o cashRegisterId já resolvido por ele) — sem essa
  // asserção, um mock genérico faria os testes acima passarem mesmo se o tenantId
  // sumisse do WHERE e o caixa aberto de QUALQUER tenant contasse como "aberto".
  it("currentOpen filtra por tenantId E status OPEN", async () => {
    const { service, prisma } = build();
    await service.currentOpen("tenant-a");
    expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a", status: "OPEN" },
    });
  });

  it("caixa aberto do tenant A não é enxergado pelo tenant B", async () => {
    const { service, prisma } = build();
    (prisma.cashRegister.findFirst as jest.Mock).mockImplementation(({ where }) =>
      Promise.resolve(where.tenantId === "tenant-a" ? { id: "cr-a" } : null),
    );

    await expect(service.currentOpen("tenant-a")).resolves.toEqual({ id: "cr-a" });
    await expect(service.currentOpen("tenant-b")).resolves.toBeNull();
    // addMovement do tenant B não deve enxergar o caixa aberto do tenant A.
    await expect(
      service.addMovement("tenant-b", { kind: "DEPOSIT", amountCents: 100 }),
    ).rejects.toThrow(NotFoundException);
  });

  it("open recusa quando já há caixa aberto", async () => {
    const { service, prisma } = build();
    (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({ id: "cr-open" });
    await expect(service.open("t-1", "u-1", { openingFloatCents: 10000 })).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
      where: { tenantId: "t-1", status: "OPEN" },
    });
  });

  it("addMovement sem caixa aberto lança NotFound", async () => {
    const { service } = build();
    await expect(
      service.addMovement("t-1", { kind: "DEPOSIT", amountCents: 5000 }),
    ).rejects.toThrow(NotFoundException);
  });

  it("sangria maior que o dinheiro em caixa é rejeitada", async () => {
    const { service, prisma } = build();
    (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({ id: "cr-1" });
    (prisma.cashMovement.findMany as jest.Mock).mockResolvedValue([
      { kind: "OPENING", amountCents: 10000 },
    ]);
    await expect(
      service.addMovement("t-1", { kind: "WITHDRAWAL", amountCents: 20000 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("close calcula diferença entre contado e esperado", async () => {
    const { service, prisma } = build();
    (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({ id: "cr-1", note: null });
    (prisma.cashMovement.findMany as jest.Mock).mockResolvedValue([
      { kind: "OPENING", amountCents: 10000 },
      { kind: "WITHDRAWAL", amountCents: 3000 },
    ]);
    (prisma.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amountCents: 5000 } });

    const result = await service.close("t-1", { closingCountedCents: 12500 });

    // esperado = 10000 - 3000 + 5000 = 12000; contado 12500 => +500
    expect(result.expectedCashCents).toBe(12000);
    expect(result.differenceCents).toBe(500);
  });
});
