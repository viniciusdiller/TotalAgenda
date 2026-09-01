import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    accessToken: string;
    refreshToken: string;
    tenantId: string;
    role: "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";
    professionalId?: string;
  }

  interface Session {
    accessToken: string;
    // Setado quando o refresh do access token falha (refresh token expirado/inválido) —
    // authedFetch já trata isso derrubando accessToken, mas telas podem checar pra forçar
    // logout com uma mensagem melhor do que um 401 genérico.
    error?: "RefreshAccessTokenError";
    user: {
      tenantId: string;
      role: "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";
      professionalId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    tenantId: string;
    role: "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";
    professionalId?: string;
    error?: "RefreshAccessTokenError";
  }
}
