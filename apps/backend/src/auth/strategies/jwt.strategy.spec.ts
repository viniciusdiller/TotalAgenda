import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@totalagenda/database";
import { JwtStrategy } from "./jwt.strategy";
import { PrismaService } from "../../prisma/prisma.service";

function buildStrategy(user: unknown) {
  const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } } as unknown as PrismaService;
  const config = { getOrThrow: () => "x".repeat(48) } as unknown as ConfigService;
  return { strategy: new JwtStrategy(config, prisma), prisma };
}

const payload = { sub: "u-1", tenantId: "tenant-token", role: Role.OWNER };

describe("JwtStrategy.validate", () => {
  it("usa tenantId/role/professionalId do BANCO, não as claims do token", async () => {
    const { strategy } = buildStrategy({
      tenantId: "tenant-db",
      role: Role.PROFESSIONAL,
      isActive: true,
      professional: { id: "prof-9" },
    });

    await expect(strategy.validate(payload)).resolves.toEqual({
      userId: "u-1",
      tenantId: "tenant-db",
      role: Role.PROFESSIONAL,
      professionalId: "prof-9",
    });
  });

  it("rejeita usuário desativado mesmo com token ainda dentro da validade", async () => {
    const { strategy } = buildStrategy({
      tenantId: "t",
      role: Role.OWNER,
      isActive: false,
      professional: null,
    });
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it("rejeita usuário que não existe mais", async () => {
    const { strategy } = buildStrategy(null);
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it("rejeita token sem role de staff (consumer/refresh) sem nem consultar o banco", async () => {
    const { strategy, prisma } = buildStrategy(null);
    await expect(
      strategy.validate({ sub: "c-1", type: "consumer" } as unknown as typeof payload),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
