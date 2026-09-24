import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { BILLING_BLOCKED_CODE, TenantBillingGuard } from "./tenant-billing.guard";
import { billingBlockMessage } from "../../billing/billing-status.util";

const FUTURE = new Date(Date.now() + 86_400_000);
const PAST = new Date(Date.now() - 86_400_000);

function buildContext(user: unknown = { tenantId: "t-1" }) {
  return {
    getHandler: () => "handler",
    getClass: () => "class",
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function buildGuard(tenant: unknown, flags: { isPublic?: boolean; skip?: boolean } = {}) {
  const reflector = {
    getAllAndOverride: jest
      .fn()
      .mockImplementation((key: string) => (key === "isPublic" ? flags.isPublic : flags.skip)),
  } as unknown as Reflector;
  const prisma = {
    tenant: { findUniqueOrThrow: jest.fn().mockResolvedValue(tenant) },
  } as unknown as PrismaService;
  return { guard: new TenantBillingGuard(reflector, prisma), prisma };
}

describe("TenantBillingGuard", () => {
  it("libera trial válido, assinatura ativa e período de graça (PAST_DUE)", async () => {
    const trial = buildGuard({ trialEndsAt: FUTURE, subscription: null });
    const active = buildGuard({ trialEndsAt: PAST, subscription: { status: "ACTIVE" } });
    const pastDue = buildGuard({ trialEndsAt: PAST, subscription: { status: "PAST_DUE" } });

    await expect(trial.guard.canActivate(buildContext())).resolves.toBe(true);
    await expect(active.guard.canActivate(buildContext())).resolves.toBe(true);
    await expect(pastDue.guard.canActivate(buildContext())).resolves.toBe(true);
  });

  // Regressão: a mesma mensagem "Período de teste encerrado" valia para assinatura cancelada e
  // não paga, e o dono não sabia o que fazer.
  it.each([
    ["TRIAL_EXPIRED", { trialEndsAt: PAST, subscription: null }],
    ["CANCELED", { trialEndsAt: PAST, subscription: { status: "CANCELED" } }],
    ["UNPAID", { trialEndsAt: PAST, subscription: { status: "UNPAID" } }],
    ["INCOMPLETE", { trialEndsAt: FUTURE, subscription: { status: "INCOMPLETE" } }],
  ] as const)("bloqueia %s com a mensagem daquele estado", async (status, tenant) => {
    const { guard } = buildGuard(tenant);

    const attempt = guard.canActivate(buildContext());

    await expect(attempt).rejects.toBeInstanceOf(ForbiddenException);
    await expect(attempt).rejects.toMatchObject({ message: billingBlockMessage(status) });
    // O frontend leva o dono à tela de plano por este código, não pelo texto.
    await expect(attempt).rejects.toMatchObject({ response: { code: BILLING_BLOCKED_CODE, statusCode: 403 } });
  });

  it("rotas públicas e @SkipBillingCheck passam sem consultar o banco (quem está bloqueado precisa poder pagar)", async () => {
    const pub = buildGuard(null, { isPublic: true });
    const skip = buildGuard(null, { skip: true });

    await expect(pub.guard.canActivate(buildContext())).resolves.toBe(true);
    await expect(skip.guard.canActivate(buildContext())).resolves.toBe(true);
    expect(pub.prisma.tenant.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(skip.prisma.tenant.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("consulta o tenant do JWT, nunca outro", async () => {
    const { guard, prisma } = buildGuard({ trialEndsAt: FUTURE, subscription: null });

    await guard.canActivate(buildContext({ tenantId: "tenant-do-jwt" }));

    expect(prisma.tenant.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tenant-do-jwt" } }),
    );
  });
});
