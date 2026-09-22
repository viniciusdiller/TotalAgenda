// Nome e opções do cookie de sessão do cliente final, compartilhados entre `consumer-session.ts`
// (Server Components/Actions, runtime Node) e `proxy.ts` (middleware, Edge Runtime). Separado
// dos dois porque nenhum pode importar o outro sem risco: consumer-session.ts usa `next/headers`
// (não existe no Edge) e proxy.ts precisa ficar livre de qualquer coisa que só rode em Node.
export const CONSUMER_COOKIE_NAME = "ta_consumer";
export const CONSUMER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 dias — ver SESSION_TTL_DAYS no backend

export function consumerCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: CONSUMER_SESSION_MAX_AGE_SECONDS,
  };
}
