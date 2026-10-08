import { ClockCounterClockwise, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { WaitlistRow } from "./WaitlistRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorks } from "@/components/ui/HowItWorks";

interface AdminWaitlistEntry {
  id: string;
  clientName: string;
  clientPhone: string;
  status: string;
  service: { name: string };
}

export default async function WaitlistPage() {
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";

  if (!isOwner) {
    return (
      <div>
        <PageHeader title="Lista de espera" />
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300">
          <LockSimple size={18} />
          Apenas o dono do negócio tem acesso à lista de espera.
        </div>
      </div>
    );
  }

  const entries = await authedFetch<AdminWaitlistEntry[]>("/waitlist?status=PENDING").catch(
    () => [],
  );

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Lista de espera"
        description="Clientes aguardando um horário livre. Entre em contato quando abrir uma vaga."
      />

      <div className="mt-6 flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <HowItWorks>
            <p>
              Quando o horário que o cliente quer está cheio, ele pode entrar na lista de espera
              pela sua página pública. Aqui você vê quem está esperando e para qual serviço.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>O sistema <strong>não avisa o cliente sozinho</strong>: quando abrir uma vaga, ligue ou chame no WhatsApp.</li>
              <li><strong>Marcar como contatado</strong> só registra que você já falou com ele; ele continua na lista.</li>
              <li><strong>Resolver</strong> tira da lista (ele agendou ou desistiu).</li>
            </ul>
          </HowItWorks>
        </div>

        <div className="flex min-w-0 flex-col">
          {entries.length === 0 ? (
            <EmptyState
              icon={ClockCounterClockwise}
              title="Ninguém na lista de espera"
              description="Clientes aguardando horário aparecem aqui assim que forem adicionados."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
              {entries.map((entry, i) => (
                <WaitlistRow
                  key={entry.id}
                  id={entry.id}
                  clientName={entry.clientName}
                  clientPhone={entry.clientPhone}
                  serviceName={entry.service.name}
                  index={i}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
