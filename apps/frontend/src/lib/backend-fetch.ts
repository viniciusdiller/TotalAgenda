import "server-only";
import { headers } from "next/headers";
import { signedVisitorHeaders } from "./client-ip";

// fetch para o backend a partir do servidor Next (Server Actions, NextAuth, Server Components):
// anexa o IP assinado do visitante para o throttle por IP do backend medir o visitante e não este
// servidor. Ver lib/client-ip.ts. Só use em chamadas cujo balde de throttle importa (login,
// refresh, senha, cadastro de cliente, chamadas autenticadas): fetches com `revalidate` são
// compartilhados entre visitantes e não devem carregar cabeçalho por visitante (fragmentaria o
// cache e o IP de um visitante valeria para todos).
async function forwardedFor(): Promise<string | null> {
  try {
    return (await headers()).get("x-forwarded-for");
  } catch {
    // Fora de um escopo de requisição (build, execução estática): sem IP, sem cabeçalho.
    return null;
  }
}

export async function backendFetch(input: string, init?: RequestInit): Promise<Response> {
  const merged = new Headers(init?.headers);
  for (const [name, value] of Object.entries(signedVisitorHeaders(await forwardedFor()))) {
    merged.set(name, value);
  }
  return fetch(input, { ...init, headers: merged });
}
