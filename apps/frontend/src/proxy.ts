import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const AUTH_PAGES = ["/entrar"];

export default auth((req) => {
  // req.auth com `error` (refresh do access token falhou — token deletado/expirado, refresh
  // token vencido) ainda é um objeto truthy. Se essa camada tratasse isso como "logado", ela
  // manda de volta pra /dashboard, o layout do dashboard vê o erro e manda pra /entrar, que
  // essa camada manda de volta pra /dashboard de novo — loop infinito de redirect. As duas
  // camadas precisam concordar sobre o que é "logado".
  const isLoggedIn = !!req.auth && !req.auth.error;
  const { pathname } = req.nextUrl;

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

  if (isDashboardRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/entrar", req.nextUrl));
  }

  if (isAuthPage && isLoggedIn) {
    // Direto pro destino final, não pra "/dashboard" — que por sua vez redireciona de novo
    // pra "/dashboard/agenda" em dashboard/page.tsx. Dois redirects encadeados (um deles na
    // camada de proxy) disparam o loop do RedirectBoundary do App Router nessa versão do
    // Next.js (vercel/next.js#48438), travando a navegação.
    return NextResponse.redirect(new URL("/dashboard/agenda", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/entrar"],
};
