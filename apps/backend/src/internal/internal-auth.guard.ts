import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import {
  INTERNAL_MAX_AGE_MS,
  INTERNAL_SIGNATURE_HEADER,
  INTERNAL_TIMESTAMP_HEADER,
  verifyInternalRequest,
} from "./internal-signature.util";

// Toda falha (sem segredo, sem cabeçalho, assinatura errada, expirada, repetida) responde igual: 403
// genérico. Quem não sabe assinar não descobre por que foi recusado nem se a rota existe de verdade.
const DENIED = "Acesso negado.";

@Injectable()
export class InternalAuthGuard implements CanActivate {
  private readonly logger = new Logger(InternalAuthGuard.name);
  // Assinaturas já vistas dentro da janela: uma requisição capturada não pode ser reenviada (o POST de
  // redefinição gerava um link novo a cada repetição). Em memória, um processo; a janela é de 5 min.
  private readonly seen = new Map<string, number>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>("INTERNAL_API_SECRET");
    if (!secret) {
      // Sem segredo configurado a API interna simplesmente não existe (fail closed).
      this.logger.warn("INTERNAL_API_SECRET não configurado: API interna desabilitada.");
      throw new ForbiddenException(DENIED);
    }

    const req = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const signature = req.headers[INTERNAL_SIGNATURE_HEADER];
    const valid = verifyInternalRequest(
      { method: req.method, path: req.originalUrl, body: req.rawBody },
      req.headers[INTERNAL_TIMESTAMP_HEADER],
      signature,
      secret,
    );
    if (!valid || typeof signature !== "string") throw new ForbiddenException(DENIED);

    const now = Date.now();
    this.evictExpired(now);
    if (this.seen.has(signature)) throw new ForbiddenException(DENIED);
    this.seen.set(signature, now + INTERNAL_MAX_AGE_MS);
    return true;
  }

  private evictExpired(now: number) {
    for (const [signature, expiresAt] of this.seen) {
      if (expiresAt <= now) this.seen.delete(signature);
    }
  }
}
