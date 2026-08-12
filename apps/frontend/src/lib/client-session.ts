import "server-only";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Sessão do cliente final (login só por telefone, ver backend/client-auth) é
// deliberadamente separada da sessão NextAuth de staff (lib/auth.ts) — são identidades e
// fluxos de login bem diferentes. Cookie por slug: um visitante pode estar "logado" em
// vários salões TotalAgenda ao mesmo tempo, cada um com sua própria sessão.
function cookieName(slug: string) {
  return `ta_client_${slug}`;
}

export async function getClientToken(slug: string): Promise<string | null> {
  const store = await cookies();
  return store.get(cookieName(slug))?.value ?? null;
}

export async function setClientToken(slug: string, token: string) {
  const store = await cookies();
  store.set(cookieName(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/${slug}`,
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearClientToken(slug: string) {
  const store = await cookies();
  store.delete({ name: cookieName(slug), path: `/${slug}` });
}

// Mesmo formato de lib/api-server.ts::authedFetch, mas lendo o cookie de cliente em vez da
// sessão NextAuth. O cookie guarda só o JWT — nome/telefone são sempre resolvidos de novo
// via client-auth/me ou my-bookings, nunca ficam expostos no cookie.
export async function clientAuthedFetch<T>(
  slug: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getClientToken(slug);
  if (!token) {
    throw new ApiError("Não autenticado.", 401);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? "Erro inesperado ao comunicar com o servidor.");
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
