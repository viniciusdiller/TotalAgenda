"use server";

import type { ConsumerLoginStatus, ConsumerSession } from "@totalagenda/shared-types";
import { ApiError } from "@/lib/api";
import { consumerPublicFetch, setConsumerToken } from "@/lib/consumer-session";

export type LoginStartResult = { status: ConsumerLoginStatus } | { error: string };
export type LoginResult = { redirectTo: string } | { error: string };

// `next` vem da query string (controlada por quem montou o link): só aceita caminho relativo
// do próprio site. "//host" e "/\host" são interpretados como URL absoluta pelo navegador —
// sem esse filtro o login viraria um open redirect pra phishing.
function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
    return next;
  }
  return "/minha-conta";
}

function messageFor(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.statusCode === 429) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
    return error.message;
  }
  return fallback;
}

export async function loginStartAction(phone: string): Promise<LoginStartResult> {
  try {
    return await consumerPublicFetch<{ status: ConsumerLoginStatus }>("/public/consumer/login/start", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  } catch (error) {
    return { error: messageFor(error, "Não foi possível continuar.") };
  }
}

async function openSession(path: string, body: unknown, next: string | undefined): Promise<LoginResult> {
  try {
    const session = await consumerPublicFetch<ConsumerSession>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    await setConsumerToken(session.accessToken);
  } catch (error) {
    // Mensagem única pra qualquer falha de credencial — o backend já responde igual pra
    // telefone inexistente, senha errada e conta travada.
    if (error instanceof ApiError && error.statusCode === 401) {
      return { error: "Telefone ou senha incorretos." };
    }
    return { error: messageFor(error, "Não foi possível entrar.") };
  }
  return { redirectTo: safeNext(next) };
}

export async function loginAction(phone: string, password: string, next?: string): Promise<LoginResult> {
  return openSession("/public/consumer/login", { phone, password }, next);
}

export async function registerAction(
  input: { name: string; phone: string; email: string; password: string; consent: boolean },
  next?: string,
): Promise<LoginResult> {
  return openSession("/public/consumer/register", input, next);
}

export async function setPasswordAction(
  input: { phone: string; email: string; password: string; consent: boolean },
  next?: string,
): Promise<LoginResult> {
  return openSession("/public/consumer/login/set-password", input, next);
}
