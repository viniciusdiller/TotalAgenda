import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { ConsumerJwtPayload, passwordVersion } from "../types/consumer-auth-user";

// Guard sem Passport (independente do JwtAuthGuard de staff), aplicado localmente via
// @Public() + @UseGuards(ConsumerJwtAuthGuard).
//
// Além da assinatura, confere no banco a linha ConsumerSession (não só a Consumer): existe, não
// revogada, não expirada, e pertence de fato ao consumerId do `sub`. É essa consulta por `sid`
// (não só por consumerId) que faz "revogar este dispositivo" (ConsumerAuthService.revokeSession)
// surtir efeito na hora, mesmo com o JWT ainda válido por assinatura/exp — sem ela, revogar um
// dispositivo não teria como derrubar especificamente aquele token. `pv` continua conferido como
// defesa extra (barata, já que a sessão inclui a senha atual no mesmo select). Toda falha usa a
// mesma mensagem genérica, sem distinguir motivo.
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
    if (payload.type !== "consumer" || typeof payload.pv !== "string" || typeof payload.sid !== "string") {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }

    const session = await this.prisma.consumerSession.findUnique({
      where: { id: payload.sid },
      select: {
        consumerId: true,
        revokedAt: true,
        expiresAt: true,
        consumer: { select: { passwordHash: true } },
      },
    });
    if (
      !session ||
      session.consumerId !== payload.sub ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      passwordVersion(session.consumer.passwordHash) !== payload.pv
    ) {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }

    request.consumerUser = { consumerId: payload.sub, sessionId: payload.sid };
    return true;
  }
}
