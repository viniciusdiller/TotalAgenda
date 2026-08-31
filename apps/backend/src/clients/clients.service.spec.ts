import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ClientsService } from "./clients.service";
import { PrismaService } from "../prisma/prisma.service";

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    client: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => ({ id: "c-1", ...data })),
      update: jest.fn().mockImplementation(({ data }) => ({ id: "c-1", ...data })),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe("ClientsService (M2)", () => {
  it("create normaliza telefone e recusa duplicado", async () => {
    const prisma = buildPrisma();
    (prisma.client.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });
    const service = new ClientsService(prisma);

    await expect(
      service.create("t-1", { name: "Ana", phone: "(11) 98888-7777" }),
    ).rejects.toThrow(ConflictException);
  });

  it("create recusa telefone implausível", async () => {
    const service = new ClientsService(buildPrisma());
    await expect(service.create("t-1", { name: "Ana", phone: "123" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("create sanitiza cpf (só dígitos) e tags (dedupe/trim)", async () => {
    const prisma = buildPrisma();
    const service = new ClientsService(prisma);

    await service.create("t-1", {
      name: " Ana ",
      phone: "11988887777",
      cpf: "123.456.789-00",
      tags: [" VIP ", "VIP", "coloração"],
    });

    const data = (prisma.client.create as jest.Mock).mock.calls[0][0].data;
    expect(data.cpf).toBe("12345678900");
    expect(data.tags).toEqual(["VIP", "coloração"]);
    expect(data.name).toBe("Ana");
  });

  it("update rejeita cliente de outro tenant", async () => {
    const prisma = buildPrisma();
    (prisma.client.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ClientsService(prisma);

    await expect(service.update("t-1", "c-9", { name: "Novo" })).rejects.toThrow(NotFoundException);
  });

  it("getDetail deduplica respostas de anamnese pela mais recente por form", async () => {
    const prisma = buildPrisma();
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({
      id: "c-1",
      appointments: [],
      intakeResponses: [
        { id: "r-2", formId: "f-1", updatedAt: new Date("2026-02-01") },
        { id: "r-1", formId: "f-1", updatedAt: new Date("2026-01-01") },
        { id: "r-3", formId: "f-2", updatedAt: new Date("2026-01-15") },
      ],
    });
    const service = new ClientsService(prisma);

    const detail = await service.getDetail("t-1", "c-1");

    expect(detail.intakeResponses.map((r) => r.id).sort()).toEqual(["r-2", "r-3"]);
  });
});
