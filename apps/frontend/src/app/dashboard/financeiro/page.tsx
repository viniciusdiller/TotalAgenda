import { redirect } from "next/navigation";
import type {
  FinanceOverview,
  FinancialCategory,
  FinancialEntry,
} from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { FinanceView } from "./FinanceView";

export default async function FinanceiroPage() {
  const session = await auth();
  if (!session || session.user.role === "PROFESSIONAL") {
    redirect("/dashboard");
  }

  const [overview, entries, categories] = await Promise.all([
    authedFetch<FinanceOverview>("/finance/overview").catch(
      () =>
        ({
          receivableCents: 0,
          receivableOverdueCents: 0,
          payableCents: 0,
          payableOverdueCents: 0,
          monthIncomeCents: 0,
          monthExpenseCents: 0,
          monthNetCents: 0,
        }) as FinanceOverview,
    ),
    authedFetch<FinancialEntry[]>("/finance/entries").catch(() => []),
    authedFetch<FinancialCategory[]>("/finance/categories").catch(() => []),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Financeiro</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Receitas das comandas entram automáticas. Despesas e contas a pagar você lança aqui.
      </p>
      <FinanceView
        overview={overview}
        entries={entries}
        categories={categories}
        role={session.user.role}
      />
    </div>
  );
}
