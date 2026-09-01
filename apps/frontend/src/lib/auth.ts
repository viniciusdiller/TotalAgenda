import NextAuth, { type Session, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Sem verificar assinatura — só pra saber quando parar de usar o access token e chamar
// /auth/refresh. A validade de verdade é sempre checada pelo backend (JwtStrategy).
//
// atob() em vez de Buffer: este callback também roda dentro do proxy.ts (Edge Runtime), que
// não tem Buffer — usar Buffer aqui faz o jwt() estourar só no proxy (não nas páginas, que
// rodam em Node.js), derrubando a sessão de forma intermitente ali e causando um loop de
// redirect 307/200 entre /dashboard/* e /entrar.
function decodeJwtExpiryMs(token: string): number {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const payload = JSON.parse(atob(padded)) as { exp: number };
  return payload.exp * 1000;
}

// Renova o access token perto do vencimento (12h no backend) usando o refresh token (30d).
// Revalida o usuário no banco a cada troca (ver AuthService.refresh) — não é só reassinar
// as claims antigas.
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Falha ao renovar o access token.");
    }

    const data = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      user: {
        tenantId: string;
        role: "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";
        professionalId?: string;
      };
    };

    return {
      ...token,
      accessToken: data.accessToken,
      accessTokenExpires: decodeJwtExpiryMs(data.accessToken),
      refreshToken: data.refreshToken,
      tenantId: data.user.tenantId,
      role: data.user.role,
      professionalId: data.user.professionalId,
      error: undefined,
    };
  } catch {
    // Access token velho fica no token, mas authedFetch trata `error` derrubando a sessão
    // em vez de mandar um Bearer morto pro backend.
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as {
          accessToken: string;
          refreshToken: string;
          user: {
            id: string;
            tenantId: string;
            role: "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";
            email: string;
            name: string;
            professionalId?: string;
          };
        };

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tenantId: data.user.tenantId,
          role: data.user.role,
          professionalId: data.user.professionalId,
        } satisfies User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = decodeJwtExpiryMs(user.accessToken);
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.professionalId = user.professionalId;
        token.error = undefined;
        return token;
      }

      // Folga de 30s pra cobrir a duração da própria requisição em andamento.
      if (Date.now() < token.accessTokenExpires - 30_000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    session({ session, token }: { session: Session; token: JWT }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      session.user.professionalId = token.professionalId;
      return session;
    },
  },
});
