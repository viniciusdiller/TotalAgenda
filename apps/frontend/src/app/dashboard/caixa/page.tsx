import { redirect } from "next/navigation";
import type { CashRegisterSummary } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        title="Caixa"
        description="Abertura com fundo de troco, sangria/suprimento e fechamento com conferência."
      />
      <CaixaView summary={summary} />
    </div>
  );
}
