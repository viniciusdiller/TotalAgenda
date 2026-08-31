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
  it("open recusa quando já há caixa aberto", async () => {
    const { service, prisma } = build();
    (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({ id: "cr-open" });
    await expect(service.open("t-1", "u-1", { openingFloatCents: 10000 })).rejects.toThrow(
      ConflictException,
    );
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
