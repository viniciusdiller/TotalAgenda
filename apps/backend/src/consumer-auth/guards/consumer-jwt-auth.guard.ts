import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConsumerJwtPayload } from "../types/consumer-auth-user";

// Mesmo estilo do ClientJwtAuthGuard: sem Passport, aplicado localmente via
// @Public() + @UseGuards(ConsumerJwtAuthGuard).
@Injectable()
export class ConsumerJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException("Não autenticado.");
    }
    try {
      const payload = this.jwtService.verify<ConsumerJwtPayload>(token);
      if (payload.type !== "consumer") {
        throw new UnauthorizedException();
      }
      request.consumerUser = { consumerId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }
  }
}
