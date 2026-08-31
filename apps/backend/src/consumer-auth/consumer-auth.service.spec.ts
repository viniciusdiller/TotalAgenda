import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ConsumerAuthService } from "./consumer-auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";

function build(over: Record<string, unknown> = {}) {
  const prisma = {
    consumer: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "c-1", ...data })),
      delete: jest.fn(),
    },
    client: { upsert: jest.fn().mockResolvedValue({ id: "cl-1" }) },
    consumerTenantLink: { upsert: jest.fn() },
    tenant: { findUnique: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    ...over,
  } as unknown as PrismaService;
  const jwt = { sign: jest.fn().mockReturnValue("tok") } as unknown as JwtService;
  return { service: new ConsumerAuthService(prisma, jwt), prisma };
}

describe("ConsumerAuthService", () => {
  const base = { name: "Ana", phone: "11988887777", consent: true };

  it("register sem consentimento é rejeitado", async () => {
    const { service } = build();
    await expect(service.register({ ...base, consent: false })).rejects.toThrow(BadRequestException);
  });

  it("register com telefone já existente lança Conflict", async () => {
    const { service, prisma } = build();
    (prisma.consumer.findUnique as jest.Mock).mockResolvedValue({ id: "existe" });
    await expect(service.register(base)).rejects.toThrow(ConflictException);
  });

  it("register normaliza telefone, grava consentimento e devolve token", async () => {
    const { service, prisma } = build();
    const result = await service.register({ ...base, phone: "+55 (11) 98888-7777" });
    const data = (prisma.consumer.create as jest.Mock).mock.calls[0][0].data;
    expect(data.phone).toBe("11988887777");
    expect(data.consentedAt).toBeInstanceOf(Date);
    expect(result.accessToken).toBe("tok");
  });

  it("login sem conta lança NotFound", async () => {
    const { service } = build();
    await expect(service.login({ phone: "11988887777" })).rejects.toThrow(NotFoundException);
  });

  it("ensureLink faz upsert de client e vínculo (idempotente)", async () => {
    const { service, prisma } = build();
    (prisma.consumer.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: "c-1",
      name: "Ana",
      phone: "11988887777",
    });
    await service.ensureLink("c-1", "t-1");
    expect(prisma.client.upsert).toHaveBeenCalled();
    expect(prisma.consumerTenantLink.upsert).toHaveBeenCalled();
  });
});
