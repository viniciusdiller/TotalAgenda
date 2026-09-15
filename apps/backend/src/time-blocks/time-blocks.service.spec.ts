import { BadRequestException, ConflictException } from "@nestjs/common";
import { TimeBlocksService } from "./time-blocks.service";
import { PrismaService } from "../prisma/prisma.service";

const FUTURE_START = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const FUTURE_END = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    professional: { findFirst: jest.fn().mockResolvedValue({ id: "prof-1", tenantId: "tenant-1" }) },
    appointment: { findFirst: jest.fn().mockResolvedValue(null) },
    timeBlock: {
      create: jest.fn().mockImplementation(({ data }) => ({ id: "block-1", ...data })),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe("TimeBlocksService.create", () => {
  it("cria o bloqueio quando não há agendamento no período", async () => {
    const prisma = buildPrisma();
    const service = new TimeBlocksService(prisma);

    const result = await service.create("tenant-1", {
      professionalId: "prof-1",
      startAt: FUTURE_START,
      endAt: FUTURE_END,
    });

    expect(result.id).toBe("block-1");
  });

  // Regressão: criar um bloqueio (folga/férias) não checava se já havia um agendamento
  // confirmado no mesmo período — o bloqueio era criado por cima, deixando o
  // agendamento e o bloqueio coexistindo de forma inconsistente sem avisar ninguém.
  it("lança ConflictException quando já existe um agendamento ocupando o período", async () => {
    const prisma = buildPrisma({
      appointment: { findFirst: jest.fn().mockResolvedValue({ id: "appt-1" }) },
    });
    const service = new TimeBlocksService(prisma);

    await expect(
      service.create("tenant-1", { professionalId: "prof-1", startAt: FUTURE_START, endAt: FUTURE_END }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.timeBlock.create).not.toHaveBeenCalled();
  });

  it("lança BadRequestException quando o início não é anterior ao término", async () => {
    const prisma = buildPrisma();
    const service = new TimeBlocksService(prisma);

    await expect(
      service.create("tenant-1", { professionalId: "prof-1", startAt: FUTURE_END, endAt: FUTURE_START }),
    ).rejects.toThrow(BadRequestException);
  });
});
