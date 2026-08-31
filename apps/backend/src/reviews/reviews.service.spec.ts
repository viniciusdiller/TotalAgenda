import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { PrismaService } from "../prisma/prisma.service";

const consumer = { consumerId: "cons-1" };

function build(over: Record<string, unknown> = {}) {
  const prisma = {
    consumerTenantLink: { findMany: jest.fn().mockResolvedValue([{ clientId: "cl-1" }]) },
    appointment: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({
        id: "a-1",
        tenantId: "t-1",
        status: "COMPLETED",
        review: null,
        client: { consumerLink: { consumerId: "cons-1" } },
      }),
    },
    review: {
      create: jest.fn().mockImplementation(({ data }) => ({ id: "r-1", ...data })),
      findFirst: jest.fn().mockResolvedValue({ id: "r-1", tenantId: "t-1" }),
      update: jest.fn().mockImplementation(({ data }) => ({ id: "r-1", ...data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...over,
  } as unknown as PrismaService;
  return { service: new ReviewsService(prisma), prisma };
}

describe("ReviewsService", () => {
  it("cria avaliação de atendimento concluído do próprio consumidor", async () => {
    const { service } = build();
    const r = await service.create(consumer, { appointmentId: "a-1", rating: 5, comment: "ótimo" });
    expect(r.rating).toBe(5);
  });

  it("recusa avaliar atendimento de outro consumidor", async () => {
    const { service, prisma } = build();
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: "a-1",
      status: "COMPLETED",
      review: null,
      client: { consumerLink: { consumerId: "outro" } },
    });
    await expect(
      service.create(consumer, { appointmentId: "a-1", rating: 4 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("recusa avaliar atendimento não concluído", async () => {
    const { service, prisma } = build();
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: "a-1",
      status: "CONFIRMED",
      review: null,
      client: { consumerLink: { consumerId: "cons-1" } },
    });
    await expect(
      service.create(consumer, { appointmentId: "a-1", rating: 4 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("recusa segunda avaliação do mesmo atendimento", async () => {
    const { service, prisma } = build();
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: "a-1",
      status: "COMPLETED",
      review: { id: "existente" },
      client: { consumerLink: { consumerId: "cons-1" } },
    });
    await expect(
      service.create(consumer, { appointmentId: "a-1", rating: 4 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("hide de avaliação de outro tenant lança NotFound", async () => {
    const { service, prisma } = build();
    (prisma.review.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.hide({ userId: "u", tenantId: "t-1", role: "OWNER" } as never, "r-9"),
    ).rejects.toThrow(NotFoundException);
  });

  it("report marca PENDING_REPORT com motivo", async () => {
    const { service, prisma } = build();
    await service.report(
      { userId: "u", tenantId: "t-1", role: "OWNER" } as never,
      "r-1",
      { reason: "linguagem ofensiva" },
    );
    const data = (prisma.review.update as jest.Mock).mock.calls[0][0].data;
    expect(data.status).toBe("PENDING_REPORT");
    expect(data.reportReason).toBe("linguagem ofensiva");
  });
});
