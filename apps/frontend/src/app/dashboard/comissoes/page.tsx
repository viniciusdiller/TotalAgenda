import { redirect } from "next/navigation";
import type { AdminProduct, CommissionRule } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ComissoesView } from "./ComissoesView";

interface CatalogService {
  id: string;
  name: string;
}
interface TeamMember {
  id: string;
  user: { name: string };
}

export default async function ComissoesPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    redirect("/dashboard");
  }

  const [rules, team, services, products] = await Promise.all([
    authedFetch<CommissionRule[]>("/commissions/rules").catch(() => []),
    authedFetch<TeamMember[]>("/professionals").catch(() => []),
    authedFetch<CatalogService[]>("/services").catch(() => []),
    authedFetch<AdminProduct[]>("/products").catch(() => []),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Comissões"
        description={
          <>
            Defina quanto cada profissional ganha por venda. A comissão é calculada sozinha
            quando uma comanda fecha, mas só vira conta a pagar de verdade quando você clicar
            em "Fechar comissões do período" lá no Financeiro.
          </>
        }
      />
      <ComissoesView
        rules={rules}
        professionals={team.map((t) => ({ id: t.id, name: t.user.name }))}
        services={services}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
