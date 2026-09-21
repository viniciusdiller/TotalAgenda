import Link from "next/link";
import { CalendarCheck } from "@phosphor-icons/react/dist/ssr";
import type { NavSession } from "@/lib/nav-session";
import { BRAND } from "../brand/palette";
import { AccountMenu } from "./AccountMenu";

// Bloco de conta da barra superior, o mesmo em todas as páginas: cliente logado vê
// "Compromissos" (com o total de horários futuros) e o menu do perfil (dropdown); dono/staff vê o acesso à
// própria loja; deslogado vê "Entrar". Sem hooks, então serve tanto em Server quanto em Client
// Components. Define a paleta da marca aqui pra funcionar fora de /[slug] e /minha-conta.
export function AccountNav({
  session,
  loginNext,
}: {
  session: NavSession;
  // Caminho pra voltar depois do login (só quando deslogado).
  loginNext?: string;
}) {
  const scope = {
    "--tenant-accent": BRAND.primary,
    "--tenant-accent-secondary": BRAND.accentCheck,
  } as React.CSSProperties;

  if (session?.kind === "staff") {
    return (
      <Link
        href="/dashboard"
        className="rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-colors hover:bg-accent-600"
      >
        {session.role === "OWNER" ? "Minha loja" : "Painel"}
      </Link>
    );
  }

  if (!session) {
    return (
      <Link
        href={loginNext ? `/entrar?next=${encodeURIComponent(loginNext)}` : "/entrar"}
        className="rounded-full px-5 py-2.5 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-300 ring-inset transition-colors hover:bg-zinc-900/5 dark:text-white dark:ring-white/20 dark:hover:bg-white/10"
      >
        Entrar
      </Link>
    );
  }

  return (
    <div style={scope} className="flex items-center gap-2.5">
      <Link
        href="/minha-conta"
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:border-(--tenant-accent)/40 dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
        <CalendarCheck size={17} className="text-(--tenant-accent)" />
        <span className="hidden sm:inline">Compromissos</span>
        {session.upcomingCount > 0 ? (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-(--tenant-accent-secondary) px-1 text-[11px] font-bold text-white">
            {session.upcomingCount}
          </span>
        ) : null}
      </Link>
      <AccountMenu name={session.name} />
    </div>
  );
}
