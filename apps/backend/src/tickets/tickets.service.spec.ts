import { BadRequestException, ConflictException } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "../products/products.service";
import { CommissionsService } from "../commissions/commissions.service";
import { CashRegisterService } from "../cash-register/cash-register.service";

function ticket(over: Record<string, unknown> = {}) {
  return {
    id: "tk-1",
    status: "OPEN",
    appointmentId: null,
    clientId: null,
    note: null,
    openedAt: new Date(),
    closedAt: null,
    discountCents: 0,
    items: [
      {
        id: "it-1",
        kind: "SERVICE",
        serviceId: "svc-1",
        productId: null,
        professionalId: "prof-1",
        description: "Corte",
        quantity: 1,
        unitPriceCents: 5000,
        professional: { user: { name: "Alex" } },
      },
    ],
    payments: [],
    client: null,
    appointment: null,
    ...over,
  };
}

function build(over: Record<string, unknown> = {}) {
  const prisma = {
    ticket: {
      findFirst: jest.fn().mockResolvedValue(ticket()),
      create: jest.fn().mockResolvedValue(ticket()),
      update: jest.fn().mockImplementation(({ data }) => ticket(data)),
    },
    ticketItem: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn() },
    payment: { create: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(prismaTx)),
    ...over,
  } as unknown as PrismaService;
  const prismaTx = {
    ticket: {
      update: jest.fn().mockImplementation(({ data }) => ticket({ ...data, items: ticket().items })),
    },
  };
  const products = { registerSale: jest.fn(), getOrThrow: jest.fn() } as unknown as ProductsService;
  const commissions = { computeForTicket: jest.fn() } as unknown as CommissionsService;
  const cash = { currentOpen: jest.fn().mockResolvedValue(null) } as unknown as CashRegisterService;
  return { service: new TicketsService(prisma, products, commissions, cash), prisma, commissions, prismaTx };
}

describe("TicketsService", () => {
  it("serialize calcula subtotal, total com desconto e saldo", async () => {
    const { service, prisma } = build();
    (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(
      ticket({ discountCents: 1000, payments: [{ id: "p1", method: "PIX", amountCents: 2000, createdAt: new Date() }] }),
    );
    const result = await service.get("t-1", "tk-1");
    expect(result.subtotalCents).toBe(5000);
    expect(result.totalCents).toBe(4000);
    expect(result.paidCents).toBe(2000);
    expect(result.dueCents).toBe(2000);
  });

  it("addPayment recusa valor acima do saldo", async () => {
    const { service } = build();
    await expect(
      service.addPayment("t-1", "tk-1", { method: "PIX", amountCents: 6000 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("close recusa quando pagamento é insuficiente", async () => {
    const { service } = build();
    await expect(service.close("t-1", "tk-1")).rejects.toThrow(BadRequestException);
  });

  it("close com pagamento completo gera comissão e fecha", async () => {
    const { service, prisma, commissions } = build();
    (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(
      ticket({ payments: [{ id: "p1", method: "CASH", amountCents: 5000, createdAt: new Date() }] }),
    );
    await service.close("t-1", "tk-1");
    expect(commissions.computeForTicket).toHaveBeenCalledTimes(1);
  });

  it("addItem em comanda fechada é rejeitado", async () => {
    const { service, prisma } = build();
    (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(ticket({ status: "CLOSED" }));
    await expect(
      service.addItem("t-1", "tk-1", { kind: "CUSTOM", description: "Gorjeta", unitPriceCents: 1000 }),
    ).rejects.toThrow(ConflictException);
  });

  it("cancel recusa se há pagamento", async () => {
    const { service, prisma } = build();
    (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(
      ticket({ payments: [{ id: "p1", method: "PIX", amountCents: 100, createdAt: new Date() }] }),
    );
    await expect(service.cancel("t-1", "tk-1")).rejects.toThrow(BadRequestException);
  });
});
