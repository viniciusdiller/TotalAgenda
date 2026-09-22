import "server-only";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api";
import { CONSUMER_COOKIE_NAME, consumerCookieOptions } from "./consumer-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Sessão do cliente final: UMA identidade global (Consumer) pra todos os salões, em um único
// cookie httpOnly — não mais um por slug. É deliberadamente separada da sessão NextAuth de
// staff (lib/auth.ts): identidades e fluxos diferentes.
//
// Sessão deslizante: o cookie dura só 14 dias (SESSION_TTL_DAYS em consumer-auth.service.ts),
// mas o proxy.ts renova o token perto do vencimento enquanto o cliente continuar visitando o
// site — na prática ele nunca vê a tela de login. Quem some por mais de 14 dias precisa logar
// de novo. Cada login cria uma sessão própria (ConsumerSession), revogável individualmente em
// /minha-conta.
export async function getConsumerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CONSUMER_COOKIE_NAME)?.value ?? null;
}

export async function setConsumerToken(token: string) {
  const store = await cookies();
  store.set(CONSUMER_COOKIE_NAME, token, consumerCookieOptions());
}

export async function clearConsumerToken() {
  const store = await cookies();
  store.delete({ name: CONSUMER_COOKIE_NAME, path: "/" });
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
