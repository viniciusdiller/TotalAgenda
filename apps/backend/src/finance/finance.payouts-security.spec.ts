import { BadRequestException, ConflictException } from "@nestjs/common";
import { DateTime } from "luxon";
import { FinanceService } from "./finance.service";
import { PrismaService } from "../prisma/prisma.service";

const SP = "America/Sao_Paulo";
const key = "8f6d2c1e-5b3a-4c7d-9e0f-1a2b3c4d5e6f";

type Setup = { accrued?: number; paid?: number; replay?: unknown };

function build({ accrued = 10000, paid = 0, replay = null }: Setup = {}) {
  const tx = {
    professional: { findFirst: jest.fn().mockResolvedValue({ id: "p1", user: { name: "Alex" } }) },
    $executeRaw: jest.fn().mockResolvedValue(1),
    commissionEntry: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: accrued } }) },
    commissionPayout: {
      findFirst: jest.fn().mockResolvedValue(replay),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: paid } }),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "pay-1", ...data })),
    },
    financialCategory: { findFirst: jest.fn().mockResolvedValue({ id: "cat" }) },
    financialEntry: { create: jest.fn().mockImplementation(({ data }) => ({ id: "fe-1", ...data })) },
  };
  const prisma = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
  return { tx, service: new FinanceService(prisma as unknown as PrismaService) };
}

const today = () => DateTime.now().setZone(SP).startOf("day");

describe("FinanceService.registerCommissionPayout: data do pagamento", () => {
  it("sem data informada assume HOJE em São Paulo e usa o instante real como paidAt", async () => {
    const { service, tx } = build();
    const before = Date.now();
    const r = await service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 100 });

    const data = tx.financialEntry.create.mock.calls[0][0].data;
    expect(r.paidOn).toBe(today().toISODate());
    expect(data.paidAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(data.dueDate.toISOString()).toBe(`${today().toISODate()}T00:00:00.000Z`);
  });

  it("aceita corrigir para um dia passado (meio-dia de SP, sem virar o dia por fuso)", async () => {
    const { service, tx } = build();
    const yesterday = today().minus({ days: 1 }).toISODate()!;
    await service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 100, paidOn: yesterday });

    const data = tx.financialEntry.create.mock.calls[0][0].data;
    expect(DateTime.fromJSDate(data.paidAt).setZone(SP).toISODate()).toBe(yesterday);
    expect(data.dueDate.toISOString()).toBe(`${yesterday}T00:00:00.000Z`);
  });

  // Data livre serviria pra empurrar um pagamento pra dentro/fora de um período já conferido.
  it("recusa data FUTURA", async () => {
    const { service, tx } = build();
    const tomorrow = today().plus({ days: 1 }).toISODate()!;
    await expect(
      service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 100, paidOn: tomorrow }),
    ).rejects.toThrow("não pode ser futura");
    expect(tx.financialEntry.create).not.toHaveBeenCalled();
  });

  it("recusa data com mais de 366 dias", async () => {
    const { service } = build();
    const old = today().minus({ days: 400 }).toISODate()!;
    await expect(
      service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 100, paidOn: old }),
    ).rejects.toThrow(BadRequestException);
  });

  it("recusa data inexistente (30/02) — validação no service, não só no DTO", async () => {
    const { service } = build();
    await expect(
      service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 100, paidOn: "2026-02-30" }),
    ).rejects.toThrow("inválida");
  });
});

describe("FinanceService.registerCommissionPayout: idempotência", () => {
  it("mesma requestKey + mesmos dados devolve o repasse existente SEM criar outro", async () => {
    const { service, tx } = build({
      accrued: 10000,
      paid: 3000,
      replay: { id: "pay-existente", professionalId: "p1", amountCents: 3000 },
    });
    const r = await service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 3000, requestKey: key });

    expect(r).toMatchObject({ id: "pay-existente", replayed: true, balanceAfterCents: 7000 });
    expect(tx.financialEntry.create).not.toHaveBeenCalled();
    expect(tx.commissionPayout.create).not.toHaveBeenCalled();
  });

  it("a busca da chave é por tenant e acontece DEPOIS do lock", async () => {
    const { service, tx } = build();
    await service.registerCommissionPayout("tenant-A", "u-1", { professionalId: "p1", amountCents: 100, requestKey: key });
    expect(tx.commissionPayout.findFirst).toHaveBeenCalledWith({ where: { tenantId: "tenant-A", requestKey: key } });
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.commissionPayout.findFirst.mock.invocationCallOrder[0]);
  });

  it("mesma requestKey com OUTRO valor → 409 (não reaproveita a chave pra pagar outra coisa)", async () => {
    const { service, tx } = build({ replay: { id: "pay-existente", professionalId: "p1", amountCents: 3000 } });
    await expect(
      service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 4000, requestKey: key }),
    ).rejects.toThrow(ConflictException);
    expect(tx.financialEntry.create).not.toHaveBeenCalled();
  });

  it("mesma requestKey para OUTRO profissional → 409", async () => {
    const { service } = build({ replay: { id: "pay-existente", professionalId: "outro", amountCents: 3000 } });
    await expect(
      service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 3000, requestKey: key }),
    ).rejects.toThrow(ConflictException);
  });

  it("grava a requestKey no repasse novo", async () => {
    const { service, tx } = build();
    await service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 100, requestKey: key });
    expect(tx.commissionPayout.create.mock.calls[0][0].data.requestKey).toBe(key);
  });

  it("sem requestKey não consulta chave nenhuma", async () => {
    const { service, tx } = build();
    await service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 100 });
    expect(tx.commissionPayout.findFirst).not.toHaveBeenCalled();
  });
});
