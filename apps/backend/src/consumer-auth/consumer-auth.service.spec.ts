import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { ConsumerAuthService } from "./consumer-auth.service";
import { PrismaService } from "../prisma/prisma.service";

const CORRECT_PASSWORD = "senha-correta-123";
// bcrypt de verdade (não mockado): o timing/comparação é parte do que os testes de lockout
// verificam — mockar bcrypt.compare esconderia justamente o que precisa ser testado.
const PASSWORD_HASH = bcrypt.hashSync(CORRECT_PASSWORD, 4);

const PHONE = "11988887777";

const BASE_CONSUMER = {
  id: "c-1",
  phone: PHONE,
  name: "Ana",
  email: "ana@example.com",
  passwordHash: PASSWORD_HASH as string | null,
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
};

// Simula a semântica de UPDATE ... SET x = x + 1 (estado mutável compartilhado entre
// chamadas), senão o teste de corrida não pega a regressão de lockout sob concorrência.
function build(initialConsumer: Record<string, unknown> | null = null, over: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = initialConsumer ? { ...initialConsumer } : {};
  const prisma: Record<string, unknown> = {
    consumer: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(initialConsumer ? { ...state } : null)),
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve({ ...state })),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "c-new", ...data })),
      update: jest.fn().mockImplementation(({ data }) => {
        const increment = data.failedLoginAttempts?.increment;
        if (typeof increment === "number") {
          state.failedLoginAttempts = ((state.failedLoginAttempts as number) ?? 0) + increment;
        } else if ("failedLoginAttempts" in data) {
          state.failedLoginAttempts = data.failedLoginAttempts;
        }
        if ("lockedUntil" in data) state.lockedUntil = data.lockedUntil;
        if ("passwordHash" in data) state.passwordHash = data.passwordHash;
        if ("email" in data) state.email = data.email;
        if ("name" in data) state.name = data.name;
        return Promise.resolve({ ...state });
      }),
      delete: jest.fn(),
    },
    client: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({ id: "cl-1", name: "Ana", phone: PHONE }),
      update: jest.fn(),
    },
    consumerTenantLink: { upsert: jest.fn() },
    ...over,
  };
  prisma.$transaction = jest.fn().mockImplementation(async (cb: (tx: unknown) => unknown) => cb(prisma));
  const jwt = { sign: jest.fn().mockReturnValue("tok") } as unknown as JwtService;
  return { service: new ConsumerAuthService(prisma as unknown as PrismaService, jwt), prisma: prisma as any };
}

describe("ConsumerAuthService.login", () => {
  it("rejeita telefone inexistente com a mesma UnauthorizedException genérica de senha errada", async () => {
    const { service } = build(null);
    await expect(service.login({ identifier: PHONE, password: "qualquer" })).rejects.toThrow(
      new UnauthorizedException("Credenciais inválidas."),
    );
  });

  it("aceita e-mail (case-insensitive) como identificador", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    const result = await service.login({ identifier: " ANA@Example.com ", password: CORRECT_PASSWORD });
    expect(result.accessToken).toBe("tok");
    expect(prisma.consumer.findUnique).toHaveBeenCalledWith({ where: { email: "ana@example.com" } });
  });

  it("aceita telefone formatado como identificador", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    await service.login({ identifier: "(11) 98888-7777", password: CORRECT_PASSWORD });
    expect(prisma.consumer.findUnique).toHaveBeenCalledWith({ where: { phone: PHONE } });
  });

  // Regressão: um telefone implausível virar 400 "telefone inválido" diferenciaria esse caso de
  // "senha errada"/"conta inexistente" — o login unificado tem que devolver sempre o mesmo 401.
  it("identificador malformado cai no mesmo 401 genérico (nunca 400)", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    await expect(service.login({ identifier: "123", password: "qualquer" })).rejects.toThrow(
      new UnauthorizedException("Credenciais inválidas."),
    );
    expect(prisma.consumer.findUnique).not.toHaveBeenCalled();
  });

  // Regressão: conta sem senha (ainda não reivindicada) tem que ser indistinguível de conta
  // inexistente no login; quem reivindica é o cadastro.
  it("rejeita conta sem senha (não migrada) com o mesmo 401 genérico", async () => {
    const { service } = build({ ...BASE_CONSUMER, passwordHash: null });
    await expect(service.login({ identifier: PHONE, password: "qualquer" })).rejects.toThrow(
      new UnauthorizedException("Credenciais inválidas."),
    );
  });

  it("rejeita senha errada e incrementa failedLoginAttempts atomicamente", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    await expect(service.login({ identifier: PHONE, password: "errada" })).rejects.toThrow(UnauthorizedException);
    expect(prisma.consumer.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
  });

  it("trava a conta na 5ª tentativa errada seguida", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER, failedLoginAttempts: 4 });
    await expect(service.login({ identifier: PHONE, password: "errada" })).rejects.toThrow(UnauthorizedException);
    const calls = prisma.consumer.update.mock.calls;
    expect(calls[0][0].data).toEqual({ failedLoginAttempts: { increment: 1 } });
    expect(calls[1][0].data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  // Regressão (mesma do login de staff): ler-somar-gravar perdia tentativas sob força bruta
  // paralela e o lockout nunca disparava.
  it("incrementa corretamente sob duas tentativas concorrentes", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    await Promise.all([
      service.login({ identifier: PHONE, password: "errada-1" }).catch(() => {}),
      service.login({ identifier: PHONE, password: "errada-2" }).catch(() => {}),
    ]);
    const finalState = await prisma.consumer.findUnique();
    expect(finalState.failedLoginAttempts).toBe(2);
  });

  it("rejeita a SENHA CORRETA enquanto travada, sem tocar no contador", async () => {
    const { service, prisma } = build({
      ...BASE_CONSUMER,
      failedLoginAttempts: 6,
      lockedUntil: new Date(Date.now() + 5 * 60_000),
    });
    await expect(service.login({ identifier: PHONE, password: CORRECT_PASSWORD })).rejects.toThrow(
      UnauthorizedException,
    );
    // Senão um atacante mantém a conta bloqueada pra sempre martelando durante a janela.
    expect(prisma.consumer.update).not.toHaveBeenCalled();
  });

  it("permite login depois que lockedUntil passou e reseta o contador", async () => {
    const { service, prisma } = build({
      ...BASE_CONSUMER,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 1000),
    });
    const result = await service.login({ identifier: PHONE, password: CORRECT_PASSWORD });
    expect(result.accessToken).toBe("tok");
    expect(prisma.consumer.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

  it("login bem-sucedido sem falhas anteriores não chama update à toa", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    await service.login({ identifier: PHONE, password: CORRECT_PASSWORD });
    expect(prisma.consumer.update).not.toHaveBeenCalled();
  });
});

describe("ConsumerAuthService.register (cadastro e reivindicação)", () => {
  const dto = {
    name: "Ana",
    phone: PHONE,
    email: "Ana@Example.com",
    password: CORRECT_PASSWORD,
    consent: true,
  };

  it("sem consentimento é rejeitado", async () => {
    const { service } = build(null);
    await expect(service.register({ ...dto, consent: false })).rejects.toThrow(BadRequestException);
  });

  it("conta que já tem senha lança Conflict e não altera nada", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    await expect(service.register(dto)).rejects.toThrow(ConflictException);
    expect(prisma.consumer.update).not.toHaveBeenCalled();
  });

  it("e-mail já usado por OUTRO consumidor lança Conflict", async () => {
    const { service, prisma } = build(null);
    prisma.consumer.findUnique.mockImplementation(({ where }: { where: Record<string, string> }) =>
      Promise.resolve(where.email ? { id: "outro" } : null),
    );
    await expect(service.register(dto)).rejects.toThrow(ConflictException);
    expect(prisma.consumer.create).not.toHaveBeenCalled();
  });

  it("normaliza telefone/e-mail, grava só o HASH da senha e o consentimento", async () => {
    const { service, prisma } = build(null);
    const result = await service.register({ ...dto, phone: "+55 (11) 98888-7777" });
    const data = prisma.consumer.create.mock.calls[0][0].data;
    expect(data.phone).toBe(PHONE);
    expect(data.email).toBe("ana@example.com");
    expect(data.passwordHash).not.toBe(CORRECT_PASSWORD);
    expect(await bcrypt.compare(CORRECT_PASSWORD, data.passwordHash)).toBe(true);
    expect(data.consentedAt).toBeInstanceOf(Date);
    expect(result.accessToken).toBe("tok");
  });

  it("reivindica um Consumer antigo sem senha (mantém o nome) e faz o backfill", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER, passwordHash: null, email: null });
    prisma.client.findMany.mockResolvedValue([
      { id: "cl-a", tenantId: "t-a" },
      { id: "cl-b", tenantId: "t-b" },
    ]);
    await service.register({ ...dto, name: "Outro Nome" });
    const data = prisma.consumer.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("name");
    expect(await bcrypt.compare(CORRECT_PASSWORD, data.passwordHash)).toBe(true);
    expect(prisma.consumerTenantLink.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.consumer.create).not.toHaveBeenCalled();
  });

  it("reivindica histórico só de Client (sem Consumer): cria a conta e liga todos os salões", async () => {
    const { service, prisma } = build(null);
    prisma.client.findMany.mockResolvedValue([{ id: "cl-a", tenantId: "t-a" }]);
    await service.register(dto);
    expect(prisma.consumer.create).toHaveBeenCalled();
    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { phone: PHONE } }),
    );
    expect(prisma.consumerTenantLink.upsert).toHaveBeenCalledTimes(1);
  });

  // Regressão de escopo: o backfill é em lote, entre vários tenants — não pode sobrescrever o
  // nome que a ficha de cada salão guarda (ensureLink, de propósito, resincroniza; este não).
  it("o backfill nunca altera Client.name de nenhum tenant", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER, passwordHash: null });
    prisma.client.findMany.mockResolvedValue([{ id: "cl-a", tenantId: "t-a" }]);
    await service.register(dto);
    expect(prisma.client.update).not.toHaveBeenCalled();
    expect(prisma.client.upsert).not.toHaveBeenCalled();
  });
});

describe("ConsumerAuthService.changePassword / updateProfile", () => {
  it("recusa senha atual incorreta", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    await expect(
      service.changePassword({ consumerId: "c-1" }, { currentPassword: "errada", newPassword: "nova-senha-123" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.consumer.update).not.toHaveBeenCalled();
  });

  it("troca a senha (só o hash) quando a atual confere", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    await service.changePassword(
      { consumerId: "c-1" },
      { currentPassword: CORRECT_PASSWORD, newPassword: "nova-senha-123" },
    );
    const hash = prisma.consumer.update.mock.calls[0][0].data.passwordHash;
    expect(hash).not.toBe("nova-senha-123");
    expect(await bcrypt.compare("nova-senha-123", hash)).toBe(true);
  });

  it("updateProfile normaliza e-mail e nunca aceita telefone", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    await service.updateProfile({ consumerId: "c-1" }, { name: " Ana Maria ", email: "NOVA@Example.com" });
    const data = prisma.consumer.update.mock.calls[0][0].data;
    expect(data).toEqual({ name: "Ana Maria", email: "nova@example.com" });
    expect(data).not.toHaveProperty("phone");
  });
});

describe("ConsumerAuthService.listEstablishments", () => {
  // Regressão: o "me" devolvia todos os salões do consumidor de uma vez. Agora a lista é
  // paginada no banco e restrita ao consumerId autenticado.
  it("pagina os vínculos do próprio consumidor e devolve só os dados públicos do salão", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    prisma.consumerTenantLink.count = jest.fn().mockResolvedValue(25);
    prisma.consumerTenantLink.findMany = jest
      .fn()
      .mockResolvedValue([{ tenant: { name: "Salão A", slug: "a", logoUrl: null } }]);

    const result = await service.listEstablishments({ consumerId: "c-1" }, { page: 2, pageSize: 12 });

    expect(prisma.consumerTenantLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { consumerId: "c-1" }, skip: 12, take: 12 }),
    );
    expect(result).toMatchObject({
      items: [{ name: "Salão A", slug: "a", logoUrl: null }],
      total: 25,
      page: 2,
      pageCount: 3,
    });
  });
});

describe("ConsumerAuthService.ensureLink", () => {
  it("faz upsert de client e vínculo usando o client recebido (participa da transação de quem chama)", async () => {
    const { service, prisma } = build({ ...BASE_CONSUMER });
    const tx = {
      consumer: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "c-1", name: "Ana", phone: PHONE }) },
      client: { upsert: jest.fn().mockResolvedValue({ id: "cl-1" }) },
      consumerTenantLink: { upsert: jest.fn() },
    };
    await service.ensureLink(tx as never, "c-1", "t-1");
    expect(tx.client.upsert).toHaveBeenCalled();
    expect(tx.consumerTenantLink.upsert).toHaveBeenCalled();
    expect(prisma.client.upsert).not.toHaveBeenCalled();
  });
});
