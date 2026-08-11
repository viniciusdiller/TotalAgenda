import { Role } from "@totalagenda/database";

export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  role: Role;
  professionalId?: string;
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: Role;
  professionalId?: string;
}
