import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { PrismaService } from "../prisma/prisma.service";

type Setup = { professional?: unknown; accrued?: number | null; paid?: number | null };

function build({ professional = { id: "p1", user: { name: "Alex" } }, accrued = 10000, paid = 0 }: Setup = {}) {
  const tx = {
    professional: { findFirst: jest.fn().mockResolvedValue(professional) },
    $executeRaw: jest.fn().mockResolvedValue(1),
    commissionEntry: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: accrued } }) },
    commissionPayout: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: paid } }),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "pay-1", ...data })),
    },
    financialCategory: { findFirst: jest.fn().mockResolvedValue({ id: "cat-comissoes" }) },
    financialEntry: { create: jest.fn().mockImplementation(({ data }) => ({ id: "fe-1", ...data })) },
  };
  const prisma = {
    $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    commissionPayout: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  };
  return { tx, prisma, service: new FinanceService(prisma as unknown as PrismaService) };
}

describe("FinanceService.registerCommissionPayout", () => {
  it("registra o repasse como despesa PAGA ligada ao CommissionPayout e devolve o saldo restante", async () => {
    const { service, tx } = build({ accrued: 10000, paid: 2000 }); // saldo = 8000

    const result = await service.registerCommissionPayout("t-1", "u-1", {
      professionalId: "p1",
      amountCents: 3000,
      note: "Pix",
    });

    expect(tx.financialEntry.create.mock.calls[0][0].data).toMatchObject({
      tenantId: "t-1",
      direction: "EXPENSE",
      status: "PAID",
      source: "COMMISSION",
      amountCents: 3000,
      categoryId: "cat-comissoes",
      counterparty: "Alex",
      createdByUserId: "u-1",
    });
    expect(tx.commissionPayout.create.mock.calls[0][0].data).toMatchObject({
      tenantId: "t-1",
      professionalId: "p1",
      amountCents: 3000,
      financialEntryId: "fe-1",
    });
    expect(result).toEqual({ id: "pay-1", amountCents: 3000, balanceAfterCents: 5000 });
  });

  // Regressão do fluxo antigo: "fechar período" duplicava a despesa. O limite agora é o saldo
  // derivado no servidor, então repassar de novo o que já foi pago é recusado.
  it("recusa repasse maior que o saldo a repassar e não cria nada", async () => {
    const { service, tx } = build({ accrued: 10000, paid: 9000 }); // saldo = 1000

    await expect(
      service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 1001 }),
    ).rejects.toThrow(BadRequestException);

    expect(tx.financialEntry.create).not.toHaveBeenCalled();
    expect(tx.commissionPayout.create).not.toHaveBeenCalled();
  });

  it("aceita repassar exatamente o saldo (zera)", async () => {
    const { service } = build({ accrued: 5000, paid: 0 });
    const r = await service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 5000 });
    expect(r.balanceAfterCents).toBe(0);
  });

  it("sem nenhuma comissão (saldo zero) qualquer repasse é recusado", async () => {
    const { service } = build({ accrued: null, paid: null });
    await expect(
      service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 1 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("profissional de outro tenant (ou inexistente) dá 404 e nem calcula saldo", async () => {
    const { service, tx } = build({ professional: null });
    await expect(
      service.registerCommissionPayout("t-1", "u-1", { professionalId: "de-outro-tenant", amountCents: 100 }),
    ).rejects.toThrow(NotFoundException);

    expect(tx.professional.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "de-outro-tenant", tenantId: "t-1" } }),
    );
    expect(tx.commissionEntry.aggregate).not.toHaveBeenCalled();
  });

  it("toma o lock por profissional ANTES de ler o saldo e filtra o saldo por tenant", async () => {
    const { service, tx } = build();
    await service.registerCommissionPayout("t-1", "u-1", { professionalId: "p1", amountCents: 100 });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.commissionEntry.aggregate.mock.invocationCallOrder[0],
    );
    expect(tx.commissionEntry.aggregate.mock.calls[0][0].where).toMatchObject({ tenantId: "t-1", professionalId: "p1" });
    expect(tx.commissionPayout.aggregate.mock.calls[0][0].where).toMatchObject({ tenantId: "t-1", professionalId: "p1" });
  });
});

describe("FinanceService.listCommissionPayouts", () => {
  it("filtra por tenant (e profissional, se pedido) e pagina", async () => {
    const { service, prisma } = build();
    const page = await service.listCommissionPayouts("t-1", { professionalId: "p1", page: 2, pageSize: 5 });

    const args = prisma.commissionPayout.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ tenantId: "t-1", professionalId: "p1" });
    expect(args).toMatchObject({ skip: 5, take: 5 });
    expect(page).toMatchObject({ items: [], total: 0, page: 2, pageSize: 5 });
  });
});
