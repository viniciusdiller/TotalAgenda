import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { CreateServiceForm } from "./CreateServiceForm";
import { ServiceRow } from "./ServiceRow";

interface AdminService {
  id: string;
  name: string;
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
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Serviços</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Depois de cadastrar, vincule cada serviço aos profissionais que o realizam.
      </p>

      {isOwner ? (
        <div className="mt-6">
          <CreateServiceForm />
        </div>
      ) : null}

      {services.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500 dark:text-stone-400">
          Nenhum serviço cadastrado ainda.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {services.map((service) => (
            <ServiceRow
              key={service.id}
              id={service.id}
              name={service.name}
              durationMinutes={service.durationMinutes}
              priceCents={service.priceCents}
              isActive={service.isActive}
              canManage={isOwner}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
