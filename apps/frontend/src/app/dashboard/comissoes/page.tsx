import type { AdminProduct, CommissionRule } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { requireRole } from "@/lib/guards";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorks } from "@/components/ui/HowItWorks";
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
  requireRole(session, ["OWNER"]);

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
      <HowItWorks>
        <p>
          Aqui você define <strong>quanto cada profissional ganha</strong> sobre o que vende.
          Cada regra vale para um profissional.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Base:</strong> “Tudo” vale para qualquer venda do profissional. “Serviço” ou “Produto” vale só para <strong>um item que você escolhe</strong> (ex.: 50% só em “Coloração”).</li>
          <li><strong>Tipo:</strong> “%” é uma porcentagem do preço do item; “R$ fixo” é um valor por unidade vendida (2 unidades = 2 vezes o valor).</li>
          <li>Se mais de uma regra serve ao mesmo item, <strong>vale a mais específica</strong> (item exato, depois serviço/produto, depois “Tudo”). Elas não se somam.</li>
          <li>Ao fechar uma comanda a comissão é calculada. Só vira conta a pagar quando você usa “Fechar comissões do período” em Financeiro → A pagar.</li>
          <li>O <strong>Relatório</strong> abaixo mostra quanto cada profissional tem a receber no período escolhido.</li>
        </ul>
      </HowItWorks>
      <ComissoesView
        rules={rules}
        professionals={team.map((t) => ({ id: t.id, name: t.user.name }))}
        services={services}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
