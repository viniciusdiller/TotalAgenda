import { redirect } from "next/navigation";
import type { AdminProduct, CommissionRule } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
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
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Comissões</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Regras por profissional e relatório por período. Lançamentos são gerados ao fechar
        cada comanda.
      </p>
      <ComissoesView
        rules={rules}
        professionals={team.map((t) => ({ id: t.id, name: t.user.name }))}
        services={services}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
