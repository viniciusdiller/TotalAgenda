import "server-only";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Sessão do cliente final: UMA identidade global (Consumer) pra todos os salões, em um único
// cookie httpOnly — não mais um por slug. Mesma expiração do JWT emitido pelo backend (30d,
// ver CONSUMER_TOKEN_EXPIRES_IN em consumer-auth.service.ts). É deliberadamente separada da
// sessão NextAuth de staff (lib/auth.ts): identidades e fluxos diferentes.
const COOKIE_NAME = "ta_consumer";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getConsumerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setConsumerToken(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearConsumerToken() {
  const store = await cookies();
  store.delete({ name: COOKIE_NAME, path: "/" });
}

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? "Erro inesperado ao comunicar com o servidor.");
    throw new ApiError(message, response.status);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// Chamadas sem sessão (login/cadastro). Só roda no servidor: o token nunca passa pelo JS do
// navegador.
export function consumerPublicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

// Mesmo formato de lib/api-server.ts::authedFetch, mas lendo o cookie do cliente em vez da
// sessão NextAuth de staff. O cookie guarda só o JWT — nome/telefone são sempre resolvidos de
// novo pelo backend, nunca ficam expostos no cookie.
export async function consumerAuthedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getConsumerToken();
  if (!token) {
    throw new ApiError("Não autenticado.", 401);
  }
  return request<T>(path, init, token);
}
