import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { verifyClientIp } from "../utils/client-ip-signature.util";

// ThrottlerGuard padrão limita por `req.ip`. Chamadas server-side do frontend (login NextAuth,
// Server Actions) chegam com o IP do servidor Next, então TODOS os visitantes dividiriam um único
// balde — e qualquer um derrubaria o login dos outros com ~10 requisições/min. Aqui o balde é o IP
// do visitante repassado pelo frontend, mas só quando vem assinado (ver client-ip-signature.util).
//
// Sem CLIENT_IP_SECRET os cabeçalhos são ignorados por completo (falha segura): o comportamento
// é o de antes. Quem chama direto (navegador -> API) segue medido por `req.ip`, que atrás do
// proxy só é o IP real com TRUST_PROXY_HOPS configurado (main.ts).
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const secret = process.env.CLIENT_IP_SECRET;
    if (secret) {
      const signedIp = verifyClientIp(req.headers ?? {}, secret);
      if (signedIp) return signedIp;
    }
    return super.getTracker(req);
  }
}
