import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RefreshTokenPayload } from "./types/auth-user";

// Refresh token de staff com ROTAÇÃO (RFC 9700 §4.14): cada token vale uma vez; usar troca por um novo da
// mesma "família" (uma família por login). O que isto compra:
//   - token copiado (disco, backup, malware) deixa de servir depois que o dono usa o dele: quem reapresentar
//     o token antigo cai na detecção de reutilização e a família INTEIRA é revogada (ladrão e dono são
//     deslogados, o dono entra de novo com a senha e o ladrão fica de fora);
//   - logout revoga de verdade (antes só apagava o cookie; o token seguia válido no servidor por 30 dias);
//   - teto absoluto de sessão: rotacionar não estende a vida da família para sempre.
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_EXPIRES_IN = "30d";
export const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
// Janela de tolerância: o Next dispara várias requisições ao mesmo tempo (middleware, Server Components,
// Server Actions) e cada uma renova com o MESMO cookie. Reuso dentro desta janela é concorrência legítima
// (emite um irmão e segue); fora dela é cópia (revoga a família). Curta o bastante para o ladrão não
// aproveitar, longa o bastante para uma navegação lenta.
export const REUSE_GRACE_MS = 60_000;

const INVALID_SESSION = "Sessão expirada. Faça login novamente.";

export interface TokenFamily {
  familyId: string;
  familyStartedAt: Date;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Emite um refresh token novo. Sem `family`, começa uma família nova (login / definir senha).
  async issue(userId: string, family?: TokenFamily): Promise<string> {
    const now = new Date();
    const jti = randomUUID();
    const familyId = family?.familyId ?? randomUUID();
    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        familyId,
        familyStartedAt: family?.familyStartedAt ?? now,
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      },
    });
    const payload: RefreshTokenPayload = { sub: userId, type: "refresh", jti, fid: familyId };
    return this.jwtService.sign(payload, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  // Gasta o token apresentado e devolve a família para emitir o sucessor. Toda falha é a MESMA 401
  // genérica (não diz se o token era desconhecido, vencido, revogado ou reutilizado).
  async consume(payload: RefreshTokenPayload): Promise<TokenFamily> {
    // Token sem jti/fid é do formato antigo (sem rotação): não é mais aceito, então o refresh de antes
    // da rotação não sobrevive ao deploy — o usuário entra de novo uma vez.
    if (!payload.jti || !payload.fid) throw new UnauthorizedException(INVALID_SESSION);

    const row = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    const now = Date.now();
    if (
      !row ||
      row.userId !== payload.sub ||
      row.familyId !== payload.fid ||
      row.revokedAt ||
      row.expiresAt.getTime() <= now ||
      row.familyStartedAt.getTime() + SESSION_MAX_AGE_MS <= now
    ) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    // Marca como usado de forma atômica: só UM de dois pedidos simultâneos com o mesmo token "ganha"
    // (count 1); o outro vê usedAt já preenchido e cai na regra de tolerância abaixo.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date(now) },
    });

    if (claimed.count === 0) {
      const current = await this.prisma.refreshToken.findUnique({
        where: { id: row.id },
        select: { usedAt: true, revokedAt: true },
      });
      const usedAt = current?.usedAt?.getTime();
      if (!current || current.revokedAt || usedAt === undefined || now - usedAt > REUSE_GRACE_MS) {
        // Reutilização fora da janela: alguém tem uma cópia. Derruba a família inteira.
        await this.revokeFamily(row.familyId);
        throw new UnauthorizedException(INVALID_SESSION);
      }
    }

    return { familyId: row.familyId, familyStartedAt: row.familyStartedAt };
  }

  // Logout / reutilização detectada. Idempotente.
  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Troca de senha / recuperação de conta: nenhuma sessão anterior sobrevive.
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Limpeza oportunista no login: sem cron, a tabela de um usuário não cresce sem teto.
  async purgeExpired(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  }
}
