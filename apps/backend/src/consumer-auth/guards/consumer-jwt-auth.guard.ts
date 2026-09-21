import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { ConsumerJwtPayload, passwordVersion } from "../types/consumer-auth-user";

// Guard sem Passport (independente do JwtAuthGuard de staff), aplicado localmente via
// @Public() + @UseGuards(ConsumerJwtAuthGuard).
//
// Além da assinatura, confere no banco que a conta ainda existe e que a versão da senha do
// token é a atual: conta excluída (LGPD) ou senha trocada derrubam a sessão na hora, em vez de
// o token continuar válido pelos 30 dias. Falha sempre com a mesma mensagem (sem distinguir).
@Injectable()
export class ConsumerJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException("Não autenticado.");
    }

    let payload: ConsumerJwtPayload;
    try {
      payload = this.jwtService.verify<ConsumerJwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }
    if (payload.type !== "consumer" || typeof payload.pv !== "string") {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }

    const consumer = await this.prisma.consumer.findUnique({
      where: { id: payload.sub },
      select: { passwordHash: true },
    });
    if (!consumer || passwordVersion(consumer.passwordHash) !== payload.pv) {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }

    request.consumerUser = { consumerId: payload.sub };
    return true;
  }
}
