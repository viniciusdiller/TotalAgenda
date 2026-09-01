import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const AUTH_PAGES = ["/entrar"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
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
