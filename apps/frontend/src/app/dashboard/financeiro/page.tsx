import { redirect } from "next/navigation";
import type {
  FinanceOverview,
  FinancialCategory,
  FinancialEntry,
} from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        title="Financeiro"
        description="Receitas das comandas entram automáticas. Despesas e contas a pagar você lança aqui."
      />
      <FinanceView
        overview={overview}
        entries={entries}
        categories={categories}
        role={session.user.role}
      />
    </div>
  );
}
