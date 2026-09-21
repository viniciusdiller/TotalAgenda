import Link from "next/link";
import clsx from "clsx";

export const ACCOUNT_TABS = [
  { id: "agenda", label: "Agenda" },
  { id: "saloes", label: "Salões" },
  { id: "conta", label: "Dados e segurança" },
] as const;

export type AccountTab = (typeof ACCOUNT_TABS)[number]["id"];

export function parseTab(value: string | string[] | undefined): AccountTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return ACCOUNT_TABS.find((tab) => tab.id === raw)?.id ?? "agenda";
}

// A aba vive na URL (?aba=saloes): navegação por links, sem estado no cliente, e cada aba
// carrega só os dados que mostra. Trocar de aba zera as páginas das listagens.
export function AccountTabs({
  active,
  upcomingCount,
}: {
  active: AccountTab;
  upcomingCount: number;
}) {
  return (
    <nav aria-label="Seções da conta" className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-white/10">
      {ACCOUNT_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.id === "agenda" ? "/minha-conta" : `/minha-conta?aba=${tab.id}`}
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              "relative -mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              isActive
                ? "border-(--tenant-accent) text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white",
            )}
          >
            {tab.label}
            {tab.id === "agenda" && upcomingCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-(--tenant-accent-secondary) px-1.5 text-[11px] font-bold text-white">
                {upcomingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
