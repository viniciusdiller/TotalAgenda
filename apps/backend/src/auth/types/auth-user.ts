import { Role } from "@totalagenda/database";

export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  role: Role;
  professionalId?: string;
}

// Sem `role` de propósito — é o que faz o JwtStrategy (STAFF_ROLES.has(payload.role))
// rejeitar automaticamente um refresh token apresentado como access token.
export interface RefreshTokenPayload {
  sub: string; // userId
  type: "refresh";
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: Role;
  professionalId?: string;
}
