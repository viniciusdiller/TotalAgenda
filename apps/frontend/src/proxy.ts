import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { decodeJwtExpiryMs } from "@/lib/jwt-decode";
import { CONSUMER_COOKIE_NAME, consumerCookieOptions } from "@/lib/consumer-cookie";

const AUTH_PAGES = ["/entrar"];
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Renova a sessão do cliente final perto do vencimento, em qualquer navegação normal — é o que
// faz ela "nunca sair" (a página em si, Server Component, não tem como reescrever o cookie;
// middleware é o único lugar que roda em toda navegação e pode). Só decodifica o token (sem
// verificar assinatura — a validade de verdade é sempre checada pelo backend em /refresh) pra
// decidir SE vale a pena chamar o backend; um token com menos de 7 dias pro vencimento (mas
// ainda não vencido) dispara a renovação, o que ainda vencido não faz — ressuscitar um token já
// morto anularia a própria expiração. Falha (rede, backend fora) não bloqueia nada: a navegação
// segue com o cookie atual, e a renovação é tentada de novo na próxima visita.
const RENEW_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;

async function renewConsumerSessionIfNeeded(req: NextRequest, response: NextResponse) {
  const token = req.cookies.get(CONSUMER_COOKIE_NAME)?.value;
  if (!token) return;

  let expiresAtMs: number;
  try {
    expiresAtMs = decodeJwtExpiryMs(token);
  } catch {
    return;
  }
  const msLeft = expiresAtMs - Date.now();
  if (msLeft <= 0 || msLeft > RENEW_WITHIN_MS) return;

  try {
    const refreshResponse = await fetch(`${API_URL}/public/consumer/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!refreshResponse.ok) return;
    const data = (await refreshResponse.json()) as { accessToken: string };
    response.cookies.set(CONSUMER_COOKIE_NAME, data.accessToken, consumerCookieOptions());
  } catch {
    // Sem sorte desta vez — tenta de novo na próxima navegação.
  }
}

export default auth(async (req) => {
  // req.auth com `error` (refresh do access token falhou — token deletado/expirado, refresh
  // token vencido) ainda é um objeto truthy. Se essa camada tratasse isso como "logado", ela
  // manda de volta pra /dashboard, o layout do dashboard vê o erro e manda pra /entrar, que
  // essa camada manda de volta pra /dashboard de novo — loop infinito de redirect. As duas
  // camadas precisam concordar sobre o que é "logado".
  const isLoggedIn = !!req.auth && !req.auth.error;
  const { pathname } = req.nextUrl;

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

  let response: NextResponse;
  if (isDashboardRoute && !isLoggedIn) {
    response = NextResponse.redirect(new URL("/entrar", req.nextUrl));
  } else if (isAuthPage && isLoggedIn) {
    // Direto pro destino final, não pra "/dashboard" — que por sua vez redireciona de novo
    // pra "/dashboard/agenda" em dashboard/page.tsx. Dois redirects encadeados (um deles na
    // camada de proxy) disparam o loop do RedirectBoundary do App Router nessa versão do
    // Next.js (vercel/next.js#48438), travando a navegação.
    response = NextResponse.redirect(new URL("/dashboard/agenda", req.nextUrl));
  } else {
    response = NextResponse.next();
  }

  // Independente da lógica de staff acima: roda em toda navegação que não seja asset.
  await renewConsumerSessionIfNeeded(req, response);

  return response;
});

export const config = {
  // Amplo de propósito: a renovação da sessão do cliente precisa rodar em praticamente toda
  // página pública (home, /descobrir, /[slug], /minha-conta, /entrar...), não só /dashboard.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
