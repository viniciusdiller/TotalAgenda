import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";

// Autentica os webhooks do Admin-TotalSoftware por segredo compartilhado (não por JWT de
// usuário): o corpo da requisição carrega webhookSecret e este guard compara com
// TOTALAGENDA_WEBHOOK_SECRET usando comparação em tempo constante para evitar timing attack.
@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = this.configService.get<string>("TOTALAGENDA_WEBHOOK_SECRET");
    if (!expectedSecret) {
      throw new ForbiddenException("Webhook não configurado.");
    }

    const request = context.switchToHttp().getRequest();
    const providedSecret = request.body?.webhookSecret;

    if (typeof providedSecret !== "string" || !safeCompare(providedSecret, expectedSecret)) {
      throw new ForbiddenException("Segredo de webhook inválido.");
    }

    return true;
  }
}

function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
