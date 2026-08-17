import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { SidebarNav } from "./SidebarNav";
import { signOutAction } from "./actions";

interface TenantMe {
  name: string;
  slug: string;
}

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session) {
    redirect("/entrar");
  }

  const tenant = await authedFetch<TenantMe>("/tenants/me").catch(() => null);

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
              {session.user.role === "OWNER" ? "Dono do negócio" : "Profissional"}
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

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
