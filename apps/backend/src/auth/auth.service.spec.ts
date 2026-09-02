import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Role } from "@totalagenda/database";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

const CORRECT_PASSWORD = "senha-correta-123";
// bcrypt de verdade (não mockado) — o próprio comportamento de timing/comparação é parte do
// que os testes de lockout/timing-attack abaixo verificam, então mockar bcrypt.compare
// esconderia justamente o que precisa ser testado.
const PASSWORD_HASH = bcrypt.hashSync(CORRECT_PASSWORD, 4); // rounds baixo só nos testes, cost não importa aqui

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(({ data }) => ({ id: "u-1", ...data })),
    },
    ...overrides,
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
    const prisma = buildPrisma();
    const service = new AuthService(prisma, buildJwtService());

    await expect(
      service.login({ email: "nao-existe@example.com", password: "qualquer" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejeita usuário desativado", async () => {
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ACTIVE_USER, isActive: false });
    const service = new AuthService(prisma, buildJwtService());

    await expect(
      service.login({ email: ACTIVE_USER.email, password: CORRECT_PASSWORD }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejeita senha errada e incrementa failedLoginAttempts", async () => {
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ACTIVE_USER });
    const service = new AuthService(prisma, buildJwtService());

    await expect(
      service.login({ email: ACTIVE_USER.email, password: "senha-errada" }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { failedLoginAttempts: 1, lockedUntil: undefined },
    });
  });

  it("trava a conta (lockedUntil no futuro) na 5ª tentativa errada seguida", async () => {
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...ACTIVE_USER,
      failedLoginAttempts: 4, // essa vai ser a 5ª
    });
    const service = new AuthService(prisma, buildJwtService());

    await expect(
      service.login({ email: ACTIVE_USER.email, password: "senha-errada" }),
    ).rejects.toThrow(UnauthorizedException);

    const data = (prisma.user.update as jest.Mock).mock.calls[0][0].data;
    expect(data.failedLoginAttempts).toBe(5);
    expect(data.lockedUntil).toBeInstanceOf(Date);
    expect(data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejeita login com a SENHA CORRETA enquanto a conta está travada, sem resetar o contador", async () => {
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
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
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
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
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
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
    const prisma = buildPrisma();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ACTIVE_USER });
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
