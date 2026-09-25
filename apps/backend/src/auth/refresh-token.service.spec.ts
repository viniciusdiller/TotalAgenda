import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  REFRESH_TOKEN_TTL_MS,
  REUSE_GRACE_MS,
  RefreshTokenService,
  SESSION_MAX_AGE_MS,
} from "./refresh-token.service";
import { PrismaService } from "../prisma/prisma.service";
import { RefreshTokenPayload } from "./types/auth-user";

interface Row {
  id: string;
  userId: string;
  familyId: string;
  familyStartedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

// Banco em memória com a semântica que importa: updateMany com `usedAt: null` é ATÔMICO (só o primeiro
// pedido "ganha"). Um mock que sempre devolvesse count 1 esconderia justamente a corrida que a rotação trata.
function buildFake() {
  const rows = new Map<string, Row>();
  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, want]) => {
      const have = (row as unknown as Record<string, unknown>)[key];
      if (want === null) return have === null;
      if (want && typeof want === "object" && "lt" in (want as object)) return (have as Date) < (want as { lt: Date }).lt;
      return have === want;
    });
  const prisma = {
    refreshToken: {
      create: jest.fn().mockImplementation(({ data }) => {
        const row: Row = { usedAt: null, revokedAt: null, createdAt: new Date(), ...data };
        rows.set(row.id, row);
        return Promise.resolve(row);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const row = rows.get(where.id);
        return Promise.resolve(row ? { ...row } : null);
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        let count = 0;
        for (const row of rows.values()) {
          if (matches(row, where)) {
            Object.assign(row, data);
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
      deleteMany: jest.fn().mockImplementation(({ where }) => {
        let count = 0;
        for (const [id, row] of rows) {
          if (matches(row, where)) {
            rows.delete(id);
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
    },
  };
  // O JWT de mentira só carrega o payload — a assinatura em si é responsabilidade do JwtService real.
  const jwt = { sign: jest.fn().mockImplementation((payload: RefreshTokenPayload) => JSON.stringify(payload)) };
  const service = new RefreshTokenService(prisma as unknown as PrismaService, jwt as unknown as JwtService);
  const payloadOf = (token: string) => JSON.parse(token) as RefreshTokenPayload;
  return { rows, service, payloadOf };
}

const INVALID = UnauthorizedException;

describe("RefreshTokenService.issue", () => {
  it("login começa uma família nova; refresh continua a mesma e não muda o início da sessão", async () => {
    const { service, payloadOf, rows } = buildFake();
    const first = payloadOf(await service.issue("u-1"));
    const family = { familyId: first.fid!, familyStartedAt: rows.get(first.jti!)!.familyStartedAt };
    const second = payloadOf(await service.issue("u-1", family));

    expect(first.jti).not.toBe(second.jti);
    expect(second.fid).toBe(first.fid);
    expect(rows.get(second.jti!)!.familyStartedAt).toEqual(family.familyStartedAt);
    expect(payloadOf(await service.issue("u-1")).fid).not.toBe(first.fid);
  });

  it("guarda só o id do token (nada utilizável num vazamento do banco)", async () => {
    const { service, rows, payloadOf } = buildFake();
    const token = await service.issue("u-1");
    const row = rows.get(payloadOf(token).jti!)!;
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(REFRESH_TOKEN_TTL_MS);
  });
});

describe("RefreshTokenService.consume: rotação", () => {
  it("aceita um token válido e o marca como usado", async () => {
    const { service, rows, payloadOf } = buildFake();
    const p = payloadOf(await service.issue("u-1"));

    await expect(service.consume(p)).resolves.toMatchObject({ familyId: p.fid });
    expect(rows.get(p.jti!)!.usedAt).toBeInstanceOf(Date);
  });

  // Reuso legítimo: o Next dispara middleware + Server Components + Server Actions ao mesmo tempo, todos
  // com o MESMO cookie. Sem tolerância, o usuário seria deslogado a cada navegação concorrente.
  it("dois pedidos SIMULTÂNEOS com o mesmo token passam (janela de tolerância) e a família continua viva", async () => {
    const { service, rows, payloadOf } = buildFake();
    const p = payloadOf(await service.issue("u-1"));

    const [a, b] = await Promise.all([service.consume(p), service.consume(p)]);

    expect(a.familyId).toBe(p.fid);
    expect(b.familyId).toBe(p.fid);
    expect([...rows.values()].every((r) => r.revokedAt === null)).toBe(true);
  });

  // O caso de segurança: alguém copiou o token. Quando o dono já rotacionou, a cópia é um token USADO.
  it("reuso FORA da janela = cópia: revoga a família inteira, inclusive o token novo do dono", async () => {
    const { service, rows, payloadOf } = buildFake();
    const stolen = payloadOf(await service.issue("u-1"));
    const family = await service.consume(stolen); // o dono rotaciona
    const ownersNew = payloadOf(await service.issue("u-1", family));

    rows.get(stolen.jti!)!.usedAt = new Date(Date.now() - REUSE_GRACE_MS - 1000); // já faz tempo

    await expect(service.consume(stolen)).rejects.toThrow(INVALID); // o ladrão apresenta a cópia
    expect(rows.get(ownersNew.jti!)!.revokedAt).toBeInstanceOf(Date);
    await expect(service.consume(ownersNew)).rejects.toThrow(INVALID); // o dono também cai e entra de novo
  });

  it("não derruba OUTRA sessão do mesmo usuário (famílias são independentes)", async () => {
    const { service, rows, payloadOf } = buildFake();
    const phone = payloadOf(await service.issue("u-1"));
    const laptop = payloadOf(await service.issue("u-1"));
    await service.consume(phone);
    rows.get(phone.jti!)!.usedAt = new Date(Date.now() - REUSE_GRACE_MS - 1000);

    await expect(service.consume(phone)).rejects.toThrow(INVALID);
    await expect(service.consume(laptop)).resolves.toBeDefined();
  });

  it("recusa token revogado, vencido, de outro usuário, de outra família e desconhecido — sempre a mesma 401", async () => {
    const { service, rows, payloadOf } = buildFake();
    const base = payloadOf(await service.issue("u-1"));

    rows.get(base.jti!)!.revokedAt = new Date();
    await expect(service.consume(base)).rejects.toThrow("Sessão expirada. Faça login novamente.");
    rows.get(base.jti!)!.revokedAt = null;

    rows.get(base.jti!)!.expiresAt = new Date(Date.now() - 1);
    await expect(service.consume(base)).rejects.toThrow(INVALID);
    rows.get(base.jti!)!.expiresAt = new Date(Date.now() + 1e9);

    await expect(service.consume({ ...base, sub: "u-2" })).rejects.toThrow(INVALID);
    await expect(service.consume({ ...base, fid: "outra-familia" })).rejects.toThrow(INVALID);
    await expect(service.consume({ ...base, jti: "nunca-emitido" })).rejects.toThrow(INVALID);
  });

  it("token no formato antigo (sem jti/fid) não é aceito", async () => {
    const { service } = buildFake();
    await expect(service.consume({ sub: "u-1", type: "refresh" })).rejects.toThrow(INVALID);
  });

  // Rotacionar não pode estender a sessão para sempre: um token roubado e mantido vivo por um script
  // continuaria renovando indefinidamente.
  it("teto absoluto da sessão: a família não passa de SESSION_MAX_AGE_MS mesmo rotacionando", async () => {
    const { service, rows, payloadOf } = buildFake();
    const p = payloadOf(await service.issue("u-1"));
    rows.get(p.jti!)!.familyStartedAt = new Date(Date.now() - SESSION_MAX_AGE_MS - 1000);

    await expect(service.consume(p)).rejects.toThrow(INVALID);
  });
});

describe("RefreshTokenService: revogação e limpeza", () => {
  it("revokeFamily revoga só aquela família", async () => {
    const { service, rows, payloadOf } = buildFake();
    const a = payloadOf(await service.issue("u-1"));
    const b = payloadOf(await service.issue("u-1"));

    await service.revokeFamily(a.fid!);

    expect(rows.get(a.jti!)!.revokedAt).toBeInstanceOf(Date);
    expect(rows.get(b.jti!)!.revokedAt).toBeNull();
  });

  it("revokeAllForUser derruba todas as sessões do usuário e nenhuma de outro", async () => {
    const { service, rows, payloadOf } = buildFake();
    const mine1 = payloadOf(await service.issue("u-1"));
    const mine2 = payloadOf(await service.issue("u-1"));
    const other = payloadOf(await service.issue("u-2"));

    await service.revokeAllForUser("u-1");

    expect(rows.get(mine1.jti!)!.revokedAt).toBeInstanceOf(Date);
    expect(rows.get(mine2.jti!)!.revokedAt).toBeInstanceOf(Date);
    expect(rows.get(other.jti!)!.revokedAt).toBeNull();
  });

  it("purgeExpired apaga só os vencidos do usuário", async () => {
    const { service, rows, payloadOf } = buildFake();
    const old = payloadOf(await service.issue("u-1"));
    const fresh = payloadOf(await service.issue("u-1"));
    rows.get(old.jti!)!.expiresAt = new Date(Date.now() - 1000);

    await service.purgeExpired("u-1");

    expect(rows.has(old.jti!)).toBe(false);
    expect(rows.has(fresh.jti!)).toBe(true);
  });
});
