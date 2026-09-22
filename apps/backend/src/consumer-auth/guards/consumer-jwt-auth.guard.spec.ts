import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConsumerJwtAuthGuard } from "./consumer-jwt-auth.guard";
import { passwordVersion } from "../types/consumer-auth-user";
import { PrismaService } from "../../prisma/prisma.service";

const HASH = "$2b$12$hash-atual";
const FUTURE = new Date(Date.now() + 60_000);
const PAST = new Date(Date.now() - 60_000);

function run(opts: { header?: string; payload?: unknown; verifyThrows?: boolean; session?: unknown }) {
  const request: Record<string, unknown> = { headers: { authorization: opts.header } };
  const jwt = {
    verify: jest.fn().mockImplementation(() => {
      if (opts.verifyThrows) throw new Error("bad");
      return opts.payload;
    }),
  } as unknown as JwtService;
  const prisma = {
    consumerSession: { findUnique: jest.fn().mockResolvedValue(opts.session ?? null) },
  } as unknown as PrismaService;
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  const guard = new ConsumerJwtAuthGuard(jwt, prisma);
  return { promise: guard.canActivate(context), request, prisma };
}

const valid = { sub: "c-1", type: "consumer", pv: passwordVersion(HASH), sid: "session-1" };
const activeSession = {
  consumerId: "c-1",
  revokedAt: null,
  expiresAt: FUTURE,
  consumer: { passwordHash: HASH },
};

describe("ConsumerJwtAuthGuard", () => {
  it("aceita token válido de sessão ativa e pertencente ao consumidor do sub", async () => {
    const { promise, request, prisma } = run({ header: "Bearer t", payload: valid, session: activeSession });
    await expect(promise).resolves.toBe(true);
    expect(request.consumerUser).toEqual({ consumerId: "c-1", sessionId: "session-1" });
    expect(prisma.consumerSession.findUnique).toHaveBeenCalledWith({
      where: { id: "session-1" },
      select: {
        consumerId: true,
        revokedAt: true,
        expiresAt: true,
        consumer: { select: { passwordHash: true } },
      },
    });
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
    expect(prisma.consumerSession.findUnique).not.toHaveBeenCalled();
  });

  it("recusa token sem pv (emitido antes desta checagem)", async () => {
    const { promise } = run({
      header: "Bearer t",
      payload: { sub: "c-1", type: "consumer", sid: "session-1" },
      session: activeSession,
    });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });

  // Regressão: token antigo (pré-sid) não carrega sessão — sem essa checagem cairia num
  // findUnique({ where: { id: undefined } }), potencialmente casando com qualquer linha.
  it("recusa token sem sid (emitido antes desta checagem)", async () => {
    const { promise, prisma } = run({
      header: "Bearer t",
      payload: { sub: "c-1", type: "consumer", pv: passwordVersion(HASH) },
    });
    await expect(promise).rejects.toThrow(UnauthorizedException);
    expect(prisma.consumerSession.findUnique).not.toHaveBeenCalled();
  });

  it("recusa sessão inexistente (token forjado ou já apagada em cascata)", async () => {
    const { promise } = run({ header: "Bearer t", payload: valid, session: null });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });

  // Regressão central deste recurso: revogar UM dispositivo (ConsumerAuthService.revokeSession)
  // precisa derrubar aquele token na hora, mesmo com assinatura/exp ainda válidos.
  it("recusa sessão revogada", async () => {
    const { promise } = run({
      header: "Bearer t",
      payload: valid,
      session: { ...activeSession, revokedAt: new Date() },
    });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });

  it("recusa sessão expirada (quem sumiu por mais de 14 dias precisa logar de novo)", async () => {
    const { promise } = run({ header: "Bearer t", payload: valid, session: { ...activeSession, expiresAt: PAST } });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });

  // Defesa extra: sid pertence a outro consumidor, mas alguém forjou um sub diferente no payload.
  it("recusa quando o consumerId da sessão não bate com o sub do token", async () => {
    const { promise } = run({
      header: "Bearer t",
      payload: valid,
      session: { ...activeSession, consumerId: "outro-consumidor" },
    });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });

  it("recusa token emitido antes de uma troca de senha (pv desatualizado)", async () => {
    const { promise } = run({
      header: "Bearer t",
      payload: valid,
      session: { ...activeSession, consumer: { passwordHash: "$2b$12$hash-NOVO-depois-da-troca" } },
    });
    await expect(promise).rejects.toThrow(UnauthorizedException);
  });
});
