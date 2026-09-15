import { redirect } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { SidebarNav } from "./SidebarNav";
import { signOutAction } from "./actions";

interface TenantMe {
  name: string;
  slug: string;
}

interface BillingStatusResponse {
  status: "TRIALING" | "TRIAL_EXPIRED" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "UNPAID";
  trialEndsAt: string;
}

// GET /billing/status já existe e funciona mesmo com trial vencido (rota
// @SkipBillingCheck), mas nenhuma página do dashboard chamava — quando o acesso
// expirava, todo `authedFetch(...).catch(() => [])` das páginas virava tela vazia sem
// nenhuma pista do motivo. A cobrança de verdade (checkout/upgrade) vive no
// Admin-TotalSoftware externo — aqui só avisamos o estado, sem tentar substituir aquele
// fluxo.
function BillingStatusBanner({ billing }: { billing: BillingStatusResponse }) {
  const trialDaysLeft = Math.ceil(
    (new Date(billing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (billing.status === "ACTIVE") return null;
  if (billing.status === "TRIALING" && trialDaysLeft > 3) return null;

  const blocked = billing.status !== "TRIALING" && billing.status !== "PAST_DUE";

  const message =
    billing.status === "TRIALING"
      ? trialDaysLeft <= 0
        ? "Seu período de teste termina hoje."
        : `Seu período de teste termina em ${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"}.`
      : billing.status === "TRIAL_EXPIRED"
        ? "Seu período de teste acabou. A página pública também parou de aceitar novos agendamentos até você assinar um plano."
        : billing.status === "PAST_DUE"
          ? "Há um problema com o pagamento da sua assinatura. Regularize para não perder o acesso."
          : "Sua assinatura não está ativa. Fale com o suporte para reativar o acesso.";

  return (
    <div
      className={clsx(
        "border-b px-6 py-2.5 text-sm font-medium",
        blocked
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
      )}
    >
      {message}
    </div>
  );
}

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session || session.error) {
    redirect("/entrar");
  }

  const [tenant, billing] = await Promise.all([
    authedFetch<TenantMe>("/tenants/me").catch(() => null),
    authedFetch<BillingStatusResponse>("/billing/status").catch(() => null),
  ]);

  return (
    <div className="flex min-h-dvh bg-stone-50 dark:bg-zinc-950">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 p-5 md:block dark:border-white/10">
        <p className="font-display text-lg font-bold text-zinc-900 dark:text-white">
          TotalAgenda
        </p>
        {tenant ? (
          <>
            <p className="mt-1 truncate text-sm text-zinc-500 dark:text-stone-400">
              {tenant.name}
            </p>
            <Link
              href={`/${tenant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 dark:text-accent-300 dark:hover:text-accent-200"
            >
              <ArrowSquareOut size={16} />
              Ver página pública
            </Link>
          </>
        ) : null}

        <div className="mt-8">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {session.user?.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-stone-400">
              {session.user.role === "OWNER"
                ? "Dono do negócio"
                : session.user.role === "RECEPTIONIST"
                  ? "Recepção"
                  : "Profissional"}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              <SignOut size={16} />
              Sair
            </button>
          </form>
        </header>

        {billing ? <BillingStatusBanner billing={billing} /> : null}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
