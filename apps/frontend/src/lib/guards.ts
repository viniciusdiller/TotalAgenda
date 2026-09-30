import { redirect } from "next/navigation";
import type { Session } from "next-auth";

type StaffRole = Session["user"]["role"];

// Bloqueia o acesso da página se não houver sessão ou o papel do usuário não estiver entre
// os permitidos — mesmo padrão (`const session = await auth(); if (<condição de role>)
// redirect(...)`) repetido no topo de 8 páginas do dashboard, sempre antes de qualquer busca
// de dado. `asserts session is Session` deixa o TypeScript saber que, depois desta chamada,
// `session` não é mais `null` (sem precisar de um `!` ou de checar de novo na página).
export function requireRole(
  session: Session | null,
  allowed: StaffRole[],
  redirectTo = "/dashboard",
): asserts session is Session {
  if (!session || !allowed.includes(session.user.role)) {
    redirect(redirectTo);
  }
}
