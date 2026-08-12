import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ClientJwtPayload } from "../types/client-auth-user";

// Guard independente do JwtAuthGuard de staff — não usa Passport, mesmo estilo do
// WebhookSecretGuard (common/guards/webhook-secret.guard.ts). Aplicado localmente via
// @Public() + @UseGuards(ClientJwtAuthGuard) rota a rota, nunca registrado como APP_GUARD.
@Injectable()
export class ClientJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException("Não autenticado.");
    }

    try {
      const payload = this.jwtService.verify<ClientJwtPayload>(token);
      if (payload.type !== "client") {
        throw new UnauthorizedException();
      }
      request.clientUser = { clientId: payload.sub, tenantId: payload.tenantId };
      return true;
    } catch {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }
  }
}
