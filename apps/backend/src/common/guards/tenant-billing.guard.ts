import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SKIP_BILLING_CHECK_KEY } from "../decorators/skip-billing-check.decorator";
import { AuthenticatedUser } from "../../auth/types/auth-user";
import { computeBillingStatus, hasBillingAccess } from "../../billing/billing-status.util";

@Injectable()
export class TenantBillingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const skipBilling = this.reflector.getAllAndOverride<boolean>(SKIP_BILLING_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || skipBilling) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      return true; // JwtAuthGuard já barrou requests sem usuário antes deste guard rodar
    }

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: user.tenantId },
      include: { subscription: true },
    });

    const status = computeBillingStatus(tenant, tenant.subscription);

    if (!hasBillingAccess(status)) {
      throw new ForbiddenException(
        "Período de teste encerrado. Assine um plano para continuar usando o TotalAgenda.",
      );
    }

    return true;
  }
}
