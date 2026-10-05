import { Scissors } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { CreateServiceForm } from "./CreateServiceForm";
import { ServiceRow } from "./ServiceRow";

interface AdminService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
}

export default async function ServicesPage() {
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";

  const services = await authedFetch<AdminService[]>("/services").catch(() => []);

  return (
    <div>
      <PageHeader
        title="Serviços"
        description="Depois de cadastrar, vincule cada serviço aos profissionais que o realizam."
      />

      <HowItWorks>
        <p>
          Serviços são o que o cliente <strong>agenda por horário</strong> (corte, barba,
          manicure). Cada um tem preço e duração.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A <strong>duração</strong> define quanto espaço o serviço ocupa na agenda e quais horários aparecem livres para o cliente.</li>
          <li>O <strong>preço</strong> é copiado para o atendimento na hora da marcação. Mudar o preço depois não altera atendimentos já marcados.</li>
          <li>Um serviço só aparece para agendar se estiver <strong>vinculado a pelo menos um profissional</strong> (em Profissionais → Gerenciar).</li>
          <li>Desativar tira o serviço do agendamento sem apagar o histórico.</li>
        </ul>
      </HowItWorks>

      {isOwner ? (
        <div className="mt-6">
          <CreateServiceForm />
        </div>
      ) : null}

      {services.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Scissors}
            title="Nenhum serviço cadastrado ainda"
            description={
              isOwner
                ? "Use o formulário acima pra cadastrar o primeiro."
                : "Peça pro dono do negócio cadastrar os serviços."
            }
          />
        </div>
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {services.map((service, i) => (
            <ServiceRow
              key={service.id}
              id={service.id}
              name={service.name}
              description={service.description}
              durationMinutes={service.durationMinutes}
              priceCents={service.priceCents}
              isActive={service.isActive}
              canManage={isOwner}
              index={i}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
