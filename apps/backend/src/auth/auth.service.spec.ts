import { UnauthorizedException } from "@nestjs/common";
import { Role } from "@totalagenda/database";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
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
};

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
