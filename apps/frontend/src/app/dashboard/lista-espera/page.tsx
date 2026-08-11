import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { WaitlistRow } from "./WaitlistRow";

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
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
          Lista de espera
        </h1>
        <p className="mt-4 text-sm text-zinc-500 dark:text-stone-400">
          Apenas o dono do negócio tem acesso à lista de espera.
        </p>
      </div>
    );
  }

  const entries = await authedFetch<AdminWaitlistEntry[]>("/waitlist?status=PENDING").catch(
    () => [],
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
        Lista de espera
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Clientes aguardando um horário livre. Entre em contato quando abrir uma vaga.
      </p>

      {entries.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500 dark:text-stone-400">
          Ninguém na lista de espera no momento.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {entries.map((entry) => (
            <WaitlistRow
              key={entry.id}
              id={entry.id}
              clientName={entry.clientName}
              clientPhone={entry.clientPhone}
              serviceName={entry.service.name}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
