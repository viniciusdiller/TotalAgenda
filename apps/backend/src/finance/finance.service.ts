import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  FinancialDirection,
  FinancialEntrySource,
  FinancialEntryStatus,
  PaymentMethod,
  Prisma,
} from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import {
  CloseCommissionsDto,
  CreateCategoryDto,
  CreateEntryDto,
  SettleEntryDto,
  UpdateCategoryDto,
  UpdateEntryDto,
} from "./dto/finance-dtos";

// Criadas na primeira vez que o tenant abre o financeiro.
const DEFAULT_CATEGORIES: Array<{ name: string; direction: FinancialDirection }> = [
  { name: "Vendas de serviços", direction: FinancialDirection.INCOME },
  { name: "Vendas de produtos", direction: FinancialDirection.INCOME },
  { name: "Outras receitas", direction: FinancialDirection.INCOME },
  { name: "Comissões", direction: FinancialDirection.EXPENSE },
  { name: "Folha / salários", direction: FinancialDirection.EXPENSE },
  { name: "Aluguel", direction: FinancialDirection.EXPENSE },
  { name: "Fornecedores / produtos", direction: FinancialDirection.EXPENSE },
  { name: "Impostos e taxas", direction: FinancialDirection.EXPENSE },
  { name: "Outras despesas", direction: FinancialDirection.EXPENSE },
];

const TICKET_INCOME_CATEGORY = "Vendas de serviços";
const COMMISSION_CATEGORY = "Comissões";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // Categorias
  // ─────────────────────────────────────────────

  async listCategories(tenantId: string) {
    const existing = await this.prisma.financialCategory.findMany({
      where: { tenantId },
      orderBy: [{ direction: "asc" }, { name: "asc" }],
    });
    if (existing.length > 0) return existing;

    await this.prisma.financialCategory.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, tenantId })),
      skipDuplicates: true,
    });
    return this.prisma.financialCategory.findMany({
      where: { tenantId },
      orderBy: [{ direction: "asc" }, { name: "asc" }],
    });
  }

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.getCategoryOrThrow(tenantId, dto.parentId);
    }
    return this.prisma.financialCategory.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        direction: dto.direction as FinancialDirection,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this.getCategoryOrThrow(tenantId, id);
    return this.prisma.financialCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived } : {}),
      },
    });
  }

  // ─────────────────────────────────────────────
  // Lançamentos
  // ─────────────────────────────────────────────

  async listEntries(
    tenantId: string,
    filters: { from?: string; to?: string; direction?: string; status?: string; basis?: string },
  ) {
    const where: Prisma.FinancialEntryWhereInput = { tenantId };
    if (filters.direction === "INCOME" || filters.direction === "EXPENSE") {
      where.direction = filters.direction;
    }
    if (["PENDING", "PAID", "CANCELED"].includes(filters.status ?? "")) {
      where.status = filters.status as FinancialEntryStatus;
    }
    const field = filters.basis === "paid" ? "paidAt" : "dueDate";
    if (filters.from || filters.to) {
      where[field] = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }
    return this.prisma.financialEntry.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
      take: 500,
    });
  }

  async createEntry(tenantId: string, userId: string, dto: CreateEntryDto) {
    if (dto.categoryId) {
      const category = await this.getCategoryOrThrow(tenantId, dto.categoryId);
      if (category.direction !== dto.direction) {
        throw new BadRequestException("Categoria não corresponde ao tipo do lançamento.");
      }
    }
    return this.prisma.financialEntry.create({
      data: {
        tenantId,
        direction: dto.direction as FinancialDirection,
        description: dto.description.trim(),
        amountCents: dto.amountCents,
        dueDate: new Date(dto.dueDate),
        categoryId: dto.categoryId ?? null,
        counterparty: dto.counterparty?.trim() || null,
        notes: dto.notes?.trim() || null,
        createdByUserId: userId,
        status: dto.paidAt ? FinancialEntryStatus.PAID : FinancialEntryStatus.PENDING,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        paymentMethod: (dto.paymentMethod as PaymentMethod) ?? null,
      },
    });
  }

  async updateEntry(tenantId: string, id: string, dto: UpdateEntryDto) {
    const entry = await this.getEntryOrThrow(tenantId, id);
    if (entry.source !== FinancialEntrySource.MANUAL) {
      throw new BadRequestException("Lançamento gerado pelo sistema não pode ser editado.");
    }
    return this.prisma.financialEntry.update({
      where: { id },
      data: {
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.amountCents !== undefined ? { amountCents: dto.amountCents } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId || null } : {}),
        ...(dto.counterparty !== undefined
          ? { counterparty: dto.counterparty?.trim() || null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    });
  }

  async settleEntry(tenantId: string, id: string, dto: SettleEntryDto) {
    const entry = await this.getEntryOrThrow(tenantId, id);
    if (entry.status === FinancialEntryStatus.PAID) {
      throw new BadRequestException("Lançamento já está quitado.");
    }
    if (entry.status === FinancialEntryStatus.CANCELED) {
      throw new BadRequestException("Lançamento cancelado não pode ser quitado.");
    }
    return this.prisma.financialEntry.update({
      where: { id },
      data: {
        status: FinancialEntryStatus.PAID,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        paymentMethod: (dto.paymentMethod as PaymentMethod) ?? entry.paymentMethod,
      },
    });
  }

  async cancelEntry(tenantId: string, id: string) {
    const entry = await this.getEntryOrThrow(tenantId, id);
    if (entry.source === FinancialEntrySource.TICKET) {
      throw new BadRequestException(
        "Receita de comanda não é cancelada aqui — cancele/estorne a comanda.",
      );
    }
    return this.prisma.financialEntry.update({
      where: { id },
      data: { status: FinancialEntryStatus.CANCELED },
    });
  }

  // ─────────────────────────────────────────────
  // Ganchos do PDV / comissão
  // ─────────────────────────────────────────────

  // Chamado dentro da transação de fechamento da comanda.
  async recordTicketIncome(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    ticket: { id: string; totalCents: number },
  ) {
    const category = await tx.financialCategory.findFirst({
      where: { tenantId, name: TICKET_INCOME_CATEGORY, direction: FinancialDirection.INCOME },
      select: { id: true },
    });
    await tx.financialEntry.create({
      data: {
        tenantId,
        direction: FinancialDirection.INCOME,
        source: FinancialEntrySource.TICKET,
        status: FinancialEntryStatus.PAID,
        description: "Venda (comanda)",
        amountCents: ticket.totalCents,
        categoryId: category?.id ?? null,
        ticketId: ticket.id,
        dueDate: new Date(),
        paidAt: new Date(),
        createdByUserId: userId,
      },
    });
  }

  async closeCommissions(tenantId: string, userId: string, dto: CloseCommissionsDto) {
    const from = new Date(dto.from);
    const to = new Date(dto.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException("Período inválido.");
    }

    const grouped = await this.prisma.commissionEntry.groupBy({
      by: ["professionalId"],
      where: { tenantId, createdAt: { gte: from, lte: to } },
      _sum: { amountCents: true },
    });
    if (grouped.length === 0) {
      throw new BadRequestException("Nenhuma comissão no período.");
    }

    const [category, professionals] = await Promise.all([
      this.prisma.financialCategory.findFirst({
        where: { tenantId, name: COMMISSION_CATEGORY, direction: FinancialDirection.EXPENSE },
        select: { id: true },
      }),
      this.prisma.professional.findMany({
        where: { tenantId, id: { in: grouped.map((g) => g.professionalId) } },
        select: { id: true, user: { select: { name: true } } },
      }),
    ]);
    const nameById = new Map(professionals.map((p) => [p.id, p.user.name]));

    const created = await this.prisma.$transaction(
      grouped
        .filter((g) => (g._sum.amountCents ?? 0) > 0)
        .map((g) =>
          this.prisma.financialEntry.create({
            data: {
              tenantId,
              direction: FinancialDirection.EXPENSE,
              source: FinancialEntrySource.COMMISSION,
              description: `Comissão ${nameById.get(g.professionalId) ?? ""} (${dto.from.slice(0, 10)} a ${dto.to.slice(0, 10)})`,
              amountCents: g._sum.amountCents ?? 0,
              categoryId: category?.id ?? null,
              counterparty: nameById.get(g.professionalId) ?? null,
              dueDate: new Date(dto.dueDate),
              createdByUserId: userId,
            },
          }),
        ),
    );
    return { created: created.length, totalCents: created.reduce((s, e) => s + e.amountCents, 0) };
  }

  // ─────────────────────────────────────────────
  // Relatórios
  // ─────────────────────────────────────────────

  async cashFlow(tenantId: string, from: string, to: string, basis: "due" | "paid" = "paid") {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    this.assertRange(fromDate, toDate);

    const field = basis === "paid" ? "paidAt" : "dueDate";
    const where: Prisma.FinancialEntryWhereInput = {
      tenantId,
      status: basis === "paid" ? FinancialEntryStatus.PAID : { not: FinancialEntryStatus.CANCELED },
      [field]: { gte: fromDate, lte: toDate },
    };
    const entries = await this.prisma.financialEntry.findMany({
      where,
      include: { category: { select: { name: true } } },
    });

    let incomeCents = 0;
    let expenseCents = 0;
    const byCategory = new Map<string, { name: string; direction: string; totalCents: number }>();
    for (const entry of entries) {
      if (entry.direction === FinancialDirection.INCOME) incomeCents += entry.amountCents;
      else expenseCents += entry.amountCents;
      const key = `${entry.direction}:${entry.category?.name ?? "Sem categoria"}`;
      const current = byCategory.get(key) ?? {
        name: entry.category?.name ?? "Sem categoria",
        direction: entry.direction,
        totalCents: 0,
      };
      current.totalCents += entry.amountCents;
      byCategory.set(key, current);
    }

    return {
      basis,
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
      byCategory: [...byCategory.values()].sort((a, b) => b.totalCents - a.totalCents),
    };
  }

  async dre(tenantId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    this.assertRange(fromDate, toDate);

    const [entries, soldProducts] = await Promise.all([
      this.prisma.financialEntry.findMany({
        where: {
          tenantId,
          status: FinancialEntryStatus.PAID,
          paidAt: { gte: fromDate, lte: toDate },
        },
        include: { category: { select: { name: true } } },
      }),
      // CMV aproximado: custo dos produtos com baixa SALE no período.
      this.prisma.stockMovement.findMany({
        where: { tenantId, kind: "SALE", createdAt: { gte: fromDate, lte: toDate } },
        include: { product: { select: { costCents: true } } },
      }),
    ]);

    const revenueCents = entries
      .filter((e) => e.direction === FinancialDirection.INCOME)
      .reduce((s, e) => s + e.amountCents, 0);

    const cogsCents = soldProducts.reduce(
      (s, m) => s + Math.abs(m.quantity) * (m.product.costCents ?? 0),
      0,
    );

    const expensesByCategory = new Map<string, number>();
    let expensesCents = 0;
    for (const entry of entries) {
      if (entry.direction !== FinancialDirection.EXPENSE) continue;
      expensesCents += entry.amountCents;
      const name = entry.category?.name ?? "Sem categoria";
      expensesByCategory.set(name, (expensesByCategory.get(name) ?? 0) + entry.amountCents);
    }

    return {
      revenueCents,
      cogsCents,
      grossProfitCents: revenueCents - cogsCents,
      expensesCents,
      expensesByCategory: [...expensesByCategory.entries()]
        .map(([name, totalCents]) => ({ name, totalCents }))
        .sort((a, b) => b.totalCents - a.totalCents),
      resultCents: revenueCents - cogsCents - expensesCents,
    };
  }

  async openItems(tenantId: string, direction: "INCOME" | "EXPENSE") {
    const now = new Date();
    const entries = await this.prisma.financialEntry.findMany({
      where: { tenantId, direction, status: FinancialEntryStatus.PENDING },
      include: { category: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    });
    return {
      totalCents: entries.reduce((s, e) => s + e.amountCents, 0),
      overdueCents: entries
        .filter((e) => e.dueDate < now)
        .reduce((s, e) => s + e.amountCents, 0),
      entries: entries.map((e) => ({
        id: e.id,
        description: e.description,
        counterparty: e.counterparty,
        categoryName: e.category?.name ?? null,
        amountCents: e.amountCents,
        dueDate: e.dueDate,
        overdueDays:
          e.dueDate < now
            ? Math.floor((now.getTime() - e.dueDate.getTime()) / 86_400_000)
            : 0,
      })),
    };
  }

  async overview(tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const [receivable, payable, month] = await Promise.all([
      this.openItems(tenantId, "INCOME"),
      this.openItems(tenantId, "EXPENSE"),
      this.cashFlow(tenantId, monthStart.toISOString(), monthEnd.toISOString(), "paid"),
    ]);
    return {
      receivableCents: receivable.totalCents,
      receivableOverdueCents: receivable.overdueCents,
      payableCents: payable.totalCents,
      payableOverdueCents: payable.overdueCents,
      monthIncomeCents: month.incomeCents,
      monthExpenseCents: month.expenseCents,
      monthNetCents: month.netCents,
    };
  }

  // ─────────────────────────────────────────────

  private assertRange(from: Date, to: Date) {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException("Intervalo inválido.");
    }
  }

  private async getCategoryOrThrow(tenantId: string, id: string) {
    const category = await this.prisma.financialCategory.findFirst({ where: { id, tenantId } });
    if (!category) throw new NotFoundException("Categoria não encontrada.");
    return category;
  }

  private async getEntryOrThrow(tenantId: string, id: string) {
    const entry = await this.prisma.financialEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException("Lançamento não encontrado.");
    return entry;
  }
}
