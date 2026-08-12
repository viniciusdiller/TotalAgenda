export interface ClientJwtPayload {
  sub: string; // clientId
  tenantId: string;
  // Discriminador que nunca existe no JwtPayload de staff (auth/types/auth-user.ts) — é o
  // que garante que um token de cliente nunca passa em rota de staff e vice-versa, mesmo os
  // dois sendo assinados com o mesmo JWT_SECRET.
  type: "client";
}

export interface AuthenticatedClient {
  clientId: string;
  tenantId: string;
}
