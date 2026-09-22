import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Role } from "@totalagenda/database";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

const CORRECT_PASSWORD = "senha-correta-123";
// bcrypt de verdade (não mockado) — o próprio comportamento de timing/comparação é parte do
// que os testes de lockout/timing-attack abaixo verificam, então mockar bcrypt.compare
// esconderia justamente o que precisa ser testado.
const PASSWORD_HASH = bcrypt.hashSync(CORRECT_PASSWORD, 4); // rounds baixo só nos testes, cost não importa aqui

// Mantém um "estado de linha" mutável e compartilhado entre chamadas — precisa simular de
// verdade a semântica de UPDATE ... SET x = x + 1 do Postgres (não só devolver o que foi
// passado), senão o teste de corrida em "incrementa corretamente sob login concorrente"
// não pega a regressão que motivou a correção (ver auth.service.ts:registerFailedLogin).
function buildPrisma(initialUser: Record<string, unknown> | null = null) {
  const state: Record<string, unknown> = initialUser ? { ...initialUser } : {};
  return {
    user: {
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve(initialUser ? { ...state } : null),
      ),
      update: jest.fn().mockImplementation(({ data }) => {
        const increment = data.failedLoginAttempts?.increment;
        if (typeof increment === "number") {
          state.failedLoginAttempts = ((state.failedLoginAttempts as number) ?? 0) + increment;
        } else if ("failedLoginAttempts" in data) {
          state.failedLoginAttempts = data.failedLoginAttempts;
        }
        if ("lockedUntil" in data) {
          state.lockedUntil = data.lockedUntil;
        }
        return Promise.resolve({ id: "u-1", ...state });
      }),
    },
  } as unknown as PrismaService;
}

function buildJwtService(overrides: Record<string, unknown> = {}) {
  return {
    sign: jest.fn().mockReturnValue("signed-token"),
    verify: jest.fn(),
    ...overrides,
  } as any;
}

const ACTIVE_USER = {
  id: "u-1",
  tenantId: "t-1",
  role: Role.OWNER,
  email: "dono@salaodemo.com",
  name: "Dona Marta",
  isActive: true,
  professional: null,
  passwordHash: PASSWORD_HASH,
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
};

describe("AuthService.login", () => {
  it("rejeita e-mail inexistente com a mesma UnauthorizedException genérica", async () => {
    const prisma = buildPrisma(null);
    const service = new AuthService(prisma, buildJwtService());

    await expect(
      service.login({ email: "nao-existe@example.com", password: "qualquer" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejeita usuário desativado", async () => {
    const prisma = buildPrisma({ ...ACTIVE_USER, isActive: false });
    const service = new AuthService(prisma, buildJwtService());

    await expect(
      service.login({ email: ACTIVE_USER.email, password: CORRECT_PASSWORD }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejeita senha errada e incrementa failedLoginAttempts", async () => {
    const prisma = buildPrisma({ ...ACTIVE_USER });
    const service = new AuthService(prisma, buildJwtService());

    await expect(
      service.login({ email: ACTIVE_USER.email, password: "senha-errada" }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    const updated = await (prisma.user.update as jest.Mock).mock.results[0].value;
    expect(updated.failedLoginAttempts).toBe(1);
  });

  it("trava a conta (lockedUntil no futuro) na 5ª tentativa errada seguida", async () => {
    const prisma = buildPrisma({
      ...ACTIVE_USER,
      failedLoginAttempts: 4, // essa vai ser a 5ª
    });
    const service = new AuthService(prisma, buildJwtService());

    await expect(
      service.login({ email: ACTIVE_USER.email, password: "senha-errada" }),
    ).rejects.toThrow(UnauthorizedException);

    // Primeiro update: incremento atômico. Segundo update: trava, já sabendo o valor
    // pós-incremento (não recalculado a partir de uma leitura antiga).
    const calls = (prisma.user.update as jest.Mock).mock.calls;
    expect(calls[0][0].data).toEqual({ failedLoginAttempts: { increment: 1 } });
    expect(calls[1][0].data.lockedUntil).toBeInstanceOf(Date);
    expect(calls[1][0].data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  // Regressão: registerFailedLogin calculava `currentAttempts + 1` a partir do valor lido
  // no início de login() e escrevia esse valor absoluto de volta. Duas chamadas concorrentes
  // (IPs diferentes, força bruta em paralelo — exatamente o que o lockout existe pra barrar)
  // liam o mesmo valor antes de qualquer escrita confirmar, então o contador só avançava +1
  // no total em vez de +2 — o lockout nunca disparava sob tentativa paralela. Com o
  // incremento atômico (`{ increment: 1 }`), cada chamada soma corretamente independente de
  // quando cada uma leu o estado.
  it("incrementa corretamente sob duas tentativas de login concorrentes (mesma conta)", async () => {
    const prisma = buildPrisma({ ...ACTIVE_USER, failedLoginAttempts: 0 });
    const service = new AuthService(prisma, buildJwtService());

    await Promise.all([
      service.login({ email: ACTIVE_USER.email, password: "errada-1" }).catch(() => {}),
      service.login({ email: ACTIVE_USER.email, password: "errada-2" }).catch(() => {}),
    ]);

    const finalState = await (prisma.user.findUnique as jest.Mock)();
    expect(finalState.failedLoginAttempts).toBe(2);
  });

  it("rejeita login com a SENHA CORRETA enquanto a conta está travada, sem resetar o contador", async () => {
    const prisma = buildPrisma({
      ...ACTIVE_USER,
      failedLoginAttempts: 6,
      lockedUntil: new Date(Date.now() + 5 * 60_000),
    });
    const service = new AuthService(prisma, buildJwtService());

    // Mesma senha que funcionaria se a conta não estivesse travada.
    await expect(
      service.login({ email: ACTIVE_USER.email, password: CORRECT_PASSWORD }),
    ).rejects.toThrow(UnauthorizedException);

    // Não é só "não expira token" — não deve nem tocar failedLoginAttempts/lockedUntil
    // enquanto travada (senão dava pra um atacante manter a conta bloqueada pra sempre
    // martelando durante a janela).
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("permite login normalmente depois que lockedUntil já passou", async () => {
    const prisma = buildPrisma({
      ...ACTIVE_USER,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 1000), // já expirou
    });
    const jwtService = buildJwtService();
    const service = new AuthService(prisma, jwtService);

    const result = await service.login({ email: ACTIVE_USER.email, password: CORRECT_PASSWORD });

    expect(result.accessToken).toBe("signed-token");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

  it("login bem-sucedido reseta failedLoginAttempts pra 0", async () => {
    const prisma = buildPrisma({
      ...ACTIVE_USER,
      failedLoginAttempts: 3,
    });
    const service = new AuthService(prisma, buildJwtService());

    await service.login({ email: ACTIVE_USER.email, password: CORRECT_PASSWORD });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

  it("login bem-sucedido sem tentativas falhas anteriores não chama update à toa", async () => {
    const prisma = buildPrisma({ ...ACTIVE_USER });
    const service = new AuthService(prisma, buildJwtService());

    await service.login({ email: ACTIVE_USER.email, password: CORRECT_PASSWORD });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("AuthService.refresh", () => {
  it("rejeita refresh token inválido/expirado", async () => {
    const jwtService = buildJwtService({
      verify: jest.fn().mockImplementation(() => {
        throw new Error("jwt expired");
      }),
    });
    const service = new AuthService(buildPrisma(), jwtService);

    await expect(service.refresh({ refreshToken: "garbage" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejeita token sem claim type: refresh (ex.: access token reaproveitado)", async () => {
    const jwtService = buildJwtService({
      verify: jest.fn().mockReturnValue({ sub: "u-1", tenantId: "t-1", role: Role.OWNER }),
    });
    const service = new AuthService(buildPrisma(), jwtService);

    await expect(service.refresh({ refreshToken: "access-token" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejeita quando o usuário não existe mais ou foi desativado", async () => {
    const jwtService = buildJwtService({
      verify: jest.fn().mockReturnValue({ sub: "u-1", type: "refresh" }),
    });
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ACTIVE_USER, isActive: false });
    const service = new AuthService(prisma, jwtService);

    await expect(service.refresh({ refreshToken: "valid-but-user-deactivated" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("emite um novo access token revalidando o usuário no banco (não confia nas claims antigas)", async () => {
    const jwtService = buildJwtService({
      verify: jest.fn().mockReturnValue({ sub: "u-1", type: "refresh" }),
    });
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(ACTIVE_USER);
    const service = new AuthService(prisma, jwtService);

    const result = await service.refresh({ refreshToken: "valid" });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u-1" },
      include: { professional: true },
    });
    expect(result.accessToken).toBe("signed-token");
    expect(result.refreshToken).toBe("signed-token");
    expect(result.user).toMatchObject({ id: "u-1", tenantId: "t-1", role: Role.OWNER });
  });
});

describe("AuthService.setPassword", () => {
  const validInvite = {
    ...ACTIVE_USER,
    passwordSetTokenExpiresAt: new Date(Date.now() + 60_000),
  };

  it("resgata o convite de um usuário ativo e devolve sessão", async () => {
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(validInvite);
    const service = new AuthService(prisma, buildJwtService());

    const result = await service.setPassword({ token: "convite", password: "nova-senha-123" });

    expect(result.accessToken).toBe("signed-token");
  });

  // Regressão: setPassword devolve tokens de sessão, então um convite ainda válido de um
  // usuário que o dono desativou reabria o acesso à conta.
  it("rejeita o convite de um usuário desativado, sem emitir sessão", async () => {
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...validInvite, isActive: false });
    const jwt = buildJwtService();
    const service = new AuthService(prisma, jwt);

    await expect(
      service.setPassword({ token: "convite", password: "nova-senha-123" }),
    ).rejects.toThrow(BadRequestException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});
