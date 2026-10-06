import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { CommissionsService } from "./commissions.service";
import { PrismaService } from "../prisma/prisma.service";

const dto = (over: Record<string, unknown> = {}) =>
  ({
    professionalId: "prof-1",
    base: "ALL",
    kind: "PERCENT",
    value: 30,
    ...over,
  }) as never;

function build(over: Record<string, unknown> = {}) {
  const rule = {
    findFirst: jest.fn().mockResolvedValue(null),
    findFirstOrThrow: jest.fn().mockResolvedValue({ id: "r1" }),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue({ id: "r1" }),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    ...over,
  };
  const prisma = {
    professional: { findFirst: jest.fn().mockResolvedValue({ id: "prof-1" }) },
    service: { findFirst: jest.fn().mockResolvedValue({ id: "svc-1" }) },
    product: { findFirst: jest.fn().mockResolvedValue({ id: "p-1" }) },
    commissionRule: rule,
  };
  return { prisma, rule, svc: new CommissionsService(prisma as unknown as PrismaService) };
}

describe("CommissionsService.updateRule", () => {
  // Regressão: `isActive: dto.isActive ?? true` reativava em silêncio uma regra que o dono desligou
  // sempre que alguém editava outro campo sem reenviar o isActive.
  it("editar sem enviar isActive MANTÉM a regra desativada", async () => {
    const { svc, rule } = build({
      findFirst: jest
        .fn()
        .mockResolvedValueOnce({ id: "r1", isActive: false }) // a própria regra
        .mockResolvedValue(null),
    });
    await svc.updateRule("t-1", "r1", dto({ value: 40 }));
    expect(rule.updateMany.mock.calls[0][0].data).toMatchObject({ isActive: false, value: 40 });
  });

  it("isActive explícito é respeitado", async () => {
    const { svc, rule } = build({
      findFirst: jest.fn().mockResolvedValueOnce({ id: "r1", isActive: false }).mockResolvedValue(null),
    });
    await svc.updateRule("t-1", "r1", dto({ isActive: true }));
    expect(rule.updateMany.mock.calls[0][0].data).toMatchObject({ isActive: true });
  });

  // IDOR: o id da regra vem da URL. A leitura E a escrita levam o tenantId no WHERE.
  it("regra de OUTRO tenant dá 404 e nada é gravado", async () => {
    const { svc, rule } = build();
    await expect(svc.updateRule("tenant-A", "regra-de-B", dto())).rejects.toThrow(NotFoundException);
    expect(rule.findFirst).toHaveBeenCalledWith({ where: { id: "regra-de-B", tenantId: "tenant-A" } });
    expect(rule.updateMany).not.toHaveBeenCalled();
  });

  it("a escrita leva id E tenantId no WHERE (não depende da checagem anterior)", async () => {
    const { svc, rule } = build({ findFirst: jest.fn().mockResolvedValueOnce({ id: "r1", isActive: true }).mockResolvedValue(null) });
    await svc.updateRule("tenant-A", "r1", dto());
    expect(rule.updateMany.mock.calls[0][0].where).toEqual({ id: "r1", tenantId: "tenant-A" });
  });

  it("se a regra sumiu entre a leitura e a escrita (count 0) responde 404", async () => {
    const { svc } = build({
      findFirst: jest.fn().mockResolvedValueOnce({ id: "r1", isActive: true }).mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    });
    await expect(svc.updateRule("t-1", "r1", dto())).rejects.toThrow(NotFoundException);
  });

  it("não deixa mover a regra para um profissional de outro tenant", async () => {
    const { svc, prisma, rule } = build({ findFirst: jest.fn().mockResolvedValueOnce({ id: "r1", isActive: true }) });
    prisma.professional.findFirst.mockResolvedValue(null);
    await expect(svc.updateRule("tenant-A", "r1", dto({ professionalId: "prof-de-B" }))).rejects.toThrow("Profissional não encontrado.");
    expect(prisma.professional.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prof-de-B", tenantId: "tenant-A" } }),
    );
    expect(rule.updateMany).not.toHaveBeenCalled();
  });

  it("não deixa apontar o alvo para serviço de outro tenant", async () => {
    const { svc, prisma, rule } = build({ findFirst: jest.fn().mockResolvedValueOnce({ id: "r1", isActive: true }) });
    prisma.service.findFirst.mockResolvedValue(null);
    await expect(svc.updateRule("tenant-A", "r1", dto({ base: "SERVICE", targetId: "svc-de-B" }))).rejects.toThrow("Serviço não encontrado.");
    expect(rule.updateMany).not.toHaveBeenCalled();
  });

  it("percentual > 100 na edição → 400", async () => {
    const { svc } = build({ findFirst: jest.fn().mockResolvedValueOnce({ id: "r1", isActive: true }) });
    await expect(svc.updateRule("t-1", "r1", dto({ value: 101 }))).rejects.toThrow(BadRequestException);
  });
});

describe("CommissionsService: regra duplicada", () => {
  // Duas regras ativas p/ o mesmo profissional+alvo empatam em pickRule: o repasse dependeria da ordem
  // em que o banco devolve as linhas.
  it("criar regra ativa igual a uma existente → 409", async () => {
    const { svc, rule } = build({ findFirst: jest.fn().mockResolvedValue({ id: "existente" }) });
    await expect(svc.createRule("t-1", dto())).rejects.toThrow(ConflictException);
    expect(rule.create).not.toHaveBeenCalled();
  });

  it("a checagem de duplicata filtra por tenant, profissional, base e alvo, só entre as ativas", async () => {
    const { svc, rule } = build({ findFirst: jest.fn().mockResolvedValue(null) });
    await svc.createRule("tenant-A", dto({ base: "SERVICE", targetId: "svc-1" }));
    expect(rule.findFirst).toHaveBeenCalledWith({
      where: { tenantId: "tenant-A", professionalId: "prof-1", base: "SERVICE", targetId: "svc-1", isActive: true },
      select: { id: true },
    });
  });

  it("editar não conflita com a própria regra (exclui o id da busca)", async () => {
    const { svc, rule } = build({
      findFirst: jest.fn().mockResolvedValueOnce({ id: "r1", isActive: true }).mockResolvedValue(null),
    });
    await svc.updateRule("t-1", "r1", dto());
    const dupWhere = rule.findFirst.mock.calls[1][0].where;
    expect(dupWhere.id).toEqual({ not: "r1" });
  });

  it("criar regra INATIVA não checa duplicata (não empata com nada)", async () => {
    const { svc, rule } = build({ findFirst: jest.fn().mockResolvedValue({ id: "existente" }) });
    await expect(svc.createRule("t-1", dto({ isActive: false }))).resolves.toBeDefined();
    expect(rule.findFirst).not.toHaveBeenCalled();
  });

  it("teto de 100 regras por profissional", async () => {
    const { svc, rule } = build({ count: jest.fn().mockResolvedValue(100) });
    await expect(svc.createRule("t-1", dto())).rejects.toThrow(BadRequestException);
    expect(rule.create).not.toHaveBeenCalled();
  });
});

describe("CommissionsService.deleteRule", () => {
  it("exclui só dentro do tenant (id + tenantId no WHERE)", async () => {
    const { svc, rule } = build();
    await expect(svc.deleteRule("tenant-A", "r1")).resolves.toEqual({ deleted: true });
    expect(rule.deleteMany).toHaveBeenCalledWith({ where: { id: "r1", tenantId: "tenant-A" } });
  });

  it("regra de outro tenant (ou inexistente) → 404 igual, sem confirmar existência", async () => {
    const { svc } = build({ deleteMany: jest.fn().mockResolvedValue({ count: 0 }) });
    await expect(svc.deleteRule("tenant-A", "regra-de-B")).rejects.toThrow("Regra de comissão não encontrada.");
  });
});

describe("CommissionsService.computeForTicket: teto e determinismo", () => {
  const item = {
    id: "it-1",
    kind: "SERVICE" as const,
    serviceId: "svc-1",
    productId: null,
    professionalId: "prof-1",
    quantity: 1,
    unitPriceCents: 5000,
  };

  function tx(rules: unknown[]) {
    const created: Array<{ amountCents: number }> = [];
    return {
      created,
      tx: {
        commissionRule: { findMany: jest.fn().mockResolvedValue(rules) },
        commissionEntry: {
          createMany: jest.fn().mockImplementation(({ data }) => {
            created.push(...data);
            return { count: data.length };
          }),
        },
      },
    };
  }
  const svc = new CommissionsService({} as unknown as PrismaService);

  // Regressão: um "R$ fixo" digitado errado (ex.: 5.000,00 em vez de 50,00) gerava repasse maior
  // que a própria venda.
  it("comissão FIXED nunca passa do valor vendido", async () => {
    const { tx: t, created } = tx([{ id: "r", professionalId: "prof-1", base: "ALL", targetId: null, kind: "FIXED", value: 500_000 }]);
    await svc.computeForTicket(t as never, "t-1", "tk-1", [item]);
    expect(created[0].amountCents).toBe(5000);
  });

  it("FIXED dentro do valor continua exato", async () => {
    const { tx: t, created } = tx([{ id: "r", professionalId: "prof-1", base: "ALL", targetId: null, kind: "FIXED", value: 1200 }]);
    await svc.computeForTicket(t as never, "t-1", "tk-1", [item]);
    expect(created[0].amountCents).toBe(1200);
  });

  it("as regras são lidas em ordem fixa (createdAt, id) para empate nunca depender do banco", async () => {
    const { tx: t } = tx([]);
    await svc.computeForTicket(t as never, "t-1", "tk-1", [item]);
    expect(t.commissionRule.findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
  });
});
