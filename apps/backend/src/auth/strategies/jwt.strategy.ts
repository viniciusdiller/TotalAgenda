import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Role } from "@totalagenda/database";
import { JwtPayload, AuthenticatedUser } from "../types/auth-user";

const STAFF_ROLES = new Set<string>(Object.values(Role));

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    // Tokens de cliente (client-auth/) são assinados com o mesmo JWT_SECRET mas têm um
    // payload diferente (sem `role`, com `type: "client"`) — sem essa checagem, um token
    // de cliente passaria despercebido por qualquer rota de staff sem @Roles() explícito,
    // já que a assinatura por si só é válida.
    if (!STAFF_ROLES.has(payload.role)) {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      professionalId: payload.professionalId,
    };
  }
}
