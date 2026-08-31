import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CommissionBase,
  CommissionKind,
  Prisma,
  TicketItemKind,
} from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertCommissionRuleDto } from "./dto/upsert-commission-rule.dto";

type RuleForMatch = {
  id: string;
  professionalId: string;
  base: CommissionBase;
  targetId: string | null;
  kind: CommissionKind;
  value: number;
};

type TicketItemForCommission = {
  id: string;
  kind: TicketItemKind;
  serviceId: string | null;
  productId: string | null;
  professionalId: string | null;
  quantity: number;
  unitPriceCents: number;
};

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  listRules(tenantId: string) {
    return this.prisma.commissionRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createRule(tenantId: string, dto: UpsertCommissionRuleDto) {
    await this.assertValid(tenantId, dto);
    return this.prisma.commissionRule.create({
      data: {
        tenantId,
        professionalId: dto.professionalId,
        base: dto.base as CommissionBase,
        targetId: dto.base === "ALL" ? null : dto.targetId!,
        kind: dto.kind as CommissionKind,
        value: dto.value,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateRule(tenantId: string, id: string, dto: UpsertCommissionRuleDto) {
    const existing = await this.prisma.commissionRule.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException("Regra de comissão não encontrada.");
    }
    await this.assertValid(tenantId, dto);
    return this.prisma.commissionRule.update({
      where: { id },
      data: {
        professionalId: dto.professionalId,
        base: dto.base as CommissionBase,
        targetId: dto.base === "ALL" ? null : dto.targetId!,
        kind: dto.kind as CommissionKind,
        value: dto.value,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async report(tenantId: string, from: string, to: string, professionalId?: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Intervalo inválido.");
    }

    const entries = await this.prisma.commissionEntry.findMany({
      where: {
        tenantId,
        createdAt: { gte: fromDate, lte: toDate },
        ...(professionalId ? { professionalId } : {}),
      },
      include: {
        professional: { include: { user: { select: { name: true } } } },
        ticketItem: { select: { description: true, kind: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const byProfessional = new Map<
      string,
      { professionalId: string; name: string; totalCents: number; count: number }
    >();
    for (const entry of entries) {
      const key = entry.professionalId;
      const current = byProfessional.get(key) ?? {
        professionalId: key,
        name: entry.professional.user.name,
        totalCents: 0,
        count: 0,
      };
      current.totalCents += entry.amountCents;
      current.count += 1;
      byProfessional.set(key, current);
    }

    return {
      totalCents: entries.reduce((sum, e) => sum + e.amountCents, 0),
      byProfessional: [...byProfessional.values()],
      entries: entries.map((e) => ({
        id: e.id,
        professionalName: e.professional.user.name,
        description: e.ticketItem.description,
        baseCents: e.baseCents,
        amountCents: e.amountCents,
        createdAt: e.createdAt,
      })),
    };
  }

  // Chamado dentro da transação de fechamento da comanda. Uma entry por item que casa com
  // a regra mais específica do profissional (target exato > base específica > ALL).
  async computeForTicket(
    tx: Prisma.TransactionClient,
    tenantId: string,
    ticketId: string,
    items: TicketItemForCommission[],
  ) {
    const professionalIds = [
      ...new Set(items.map((i) => i.professionalId).filter((id): id is string => !!id)),
    ];
    if (professionalIds.length === 0) return;

    const rules = (await tx.commissionRule.findMany({
      where: { tenantId, isActive: true, professionalId: { in: professionalIds } },
    })) as RuleForMatch[];

    const entries: Prisma.CommissionEntryCreateManyInput[] = [];
    for (const item of items) {
      if (!item.professionalId) continue;
      const rule = this.pickRule(rules, item);
      if (!rule) continue;

      const baseCents = item.unitPriceCents * item.quantity;
      const amountCents =
        rule.kind === CommissionKind.PERCENT
          ? Math.round((baseCents * rule.value) / 100)
          : rule.value * item.quantity;
      if (amountCents <= 0) continue;

      entries.push({
        tenantId,
        professionalId: item.professionalId,
        ticketId,
        ticketItemId: item.id,
        baseCents,
        amountCents,
      });
    }

    if (entries.length > 0) {
      await tx.commissionEntry.createMany({ data: entries });
    }
  }

  private pickRule(rules: RuleForMatch[], item: TicketItemForCommission): RuleForMatch | null {
    const targetId = item.kind === TicketItemKind.SERVICE ? item.serviceId : item.productId;
    const forPro = rules.filter((r) => r.professionalId === item.professionalId);

    const matches = forPro.filter((rule) => {
      if (rule.base === CommissionBase.ALL) return true;
      if (rule.base === CommissionBase.SERVICE && item.kind !== TicketItemKind.SERVICE) return false;
      if (rule.base === CommissionBase.PRODUCT && item.kind !== TicketItemKind.PRODUCT) return false;
      return rule.targetId ? rule.targetId === targetId : true;
    });
    if (matches.length === 0) return null;

    // Prioridade: target exato > base específica (SERVICE/PRODUCT) > ALL.
    const score = (rule: RuleForMatch) =>
      (rule.targetId && rule.targetId === targetId ? 4 : 0) + (rule.base !== CommissionBase.ALL ? 2 : 0);
    return matches.sort((a, b) => score(b) - score(a))[0];
  }

  private async assertValid(tenantId: string, dto: UpsertCommissionRuleDto) {
    const professional = await this.prisma.professional.findFirst({
      where: { id: dto.professionalId, tenantId },
      select: { id: true },
    });
    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }
    if (dto.base !== "ALL" && !dto.targetId) {
      throw new BadRequestException("Informe o serviço/produto alvo para regras específicas.");
    }
    if (dto.kind === "PERCENT" && dto.value > 100) {
      throw new BadRequestException("Percentual de comissão não pode passar de 100.");
    }
  }
}
