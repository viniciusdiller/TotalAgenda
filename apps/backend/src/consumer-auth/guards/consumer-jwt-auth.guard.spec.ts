import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConsumerJwtAuthGuard } from "./consumer-jwt-auth.guard";
import { passwordVersion } from "../types/consumer-auth-user";
import { PrismaService } from "../../prisma/prisma.service";

const HASH = "$2b$12$hash-atual";

function run(opts: { header?: string; payload?: unknown; verifyThrows?: boolean; consumer?: unknown }) {
  const request: Record<string, unknown> = { headers: { authorization: opts.header } };
  const jwt = {
    verify: jest.fn().mockImplementation(() => {
      if (opts.verifyThrows) throw new Error("bad");
      return opts.payload;
    }),
  } as unknown as JwtService;
  const prisma = {
    consumer: { findUnique: jest.fn().mockResolvedValue(opts.consumer ?? null) },
  } as unknown as PrismaService;
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  const guard = new ConsumerJwtAuthGuard(jwt, prisma);
  return { promise: guard.canActivate(context), request, prisma };
}

const valid = { sub: "c-1", type: "consumer", pv: passwordVersion(HASH) };

describe("ConsumerJwtAuthGuard", () => {
  it("aceita token válido de conta existente com a versão de senha atual", async () => {
    const { promise, request } = run({ header: "Bearer t", payload: valid, consumer: { passwordHash: HASH } });
    await expect(promise).resolves.toBe(true);
    expect(request.consumerUser).toEqual({ consumerId: "c-1" });
  });

  it("recusa sem cabeçalho Bearer", async () => {
    const { promise } = run({ header: undefined });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });

  it("recusa assinatura inválida/expirada", async () => {
    const { promise } = run({ header: "Bearer t", verifyThrows: true });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });

  it("recusa token de staff/refresh (type diferente) sem consultar o banco", async () => {
    const { promise, prisma } = run({ header: "Bearer t", payload: { sub: "u-1", type: "refresh" } });
    await expect(promise).rejects.toThrow(UnauthorizedException);
    expect(prisma.consumer.findUnique).not.toHaveBeenCalled();
  });

  // Regressão: token antigo (sem pv) e token de conta excluída continuavam válidos por 30 dias.
  it("recusa token sem versão de senha (emitido antes desta checagem)", async () => {
    const { promise } = run({
      header: "Bearer t",
      payload: { sub: "c-1", type: "consumer" },
      consumer: { passwordHash: HASH },
    });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });

  it("recusa token de conta que foi excluída", async () => {
    const { promise } = run({ header: "Bearer t", payload: valid, consumer: null });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });

  it("recusa token emitido antes de uma troca de senha (versão diferente)", async () => {
    const { promise } = run({
      header: "Bearer t",
      payload: valid,
      consumer: { passwordHash: "$2b$12$hash-NOVO-depois-da-troca" },
    });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });
});
