import "server-only";
import type { ConsumerMe } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { consumerAuthedFetch, getConsumerToken } from "@/lib/consumer-session";

export type NavSession =
  | { kind: "staff"; name: string; role: "OWNER" | "RECEPTIONIST" | "PROFESSIONAL" }
  | { kind: "consumer"; name: string }
  | null;

// Quem está logado, pra navbar da home mostrar o acesso certo. Duas identidades separadas (staff
// = NextAuth, cliente = cookie ta_consumer); staff tem prioridade se as duas existirem. Falha
// (token expirado, backend fora) degrada pra deslogado em vez de quebrar a home.
export async function getNavSession(): Promise<NavSession> {
  try {
    const staff = await auth();
    if (staff?.user && !staff.error) {
      return { kind: "staff", name: staff.user.name ?? "", role: staff.user.role };
    }
  } catch {
    /* sessão de staff inválida: segue como deslogado/cliente */
  }

  if (!(await getConsumerToken())) return null;
  try {
    const me = await consumerAuthedFetch<ConsumerMe>("/public/consumer/me");
    return { kind: "consumer", name: me.name };
  } catch {
    return null;
  }
}
