import { redirect } from "next/navigation";
import type { CashRegisterSummary } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { CaixaView } from "./CaixaView";

export default async function CaixaPage() {
  const session = await auth();
  if (session?.user.role === "PROFESSIONAL") {
    redirect("/dashboard");
  }

  const summary = await authedFetch<CashRegisterSummary>("/cash-register").catch(
    () => ({ open: false }) as CashRegisterSummary,
  );

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Caixa</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Abertura com fundo de troco, sangria/suprimento e fechamento com conferência.
      </p>
      <CaixaView summary={summary} />
    </div>
  );
}
