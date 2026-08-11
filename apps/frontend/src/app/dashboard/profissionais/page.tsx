import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { CreateProfessionalForm } from "./CreateProfessionalForm";
import { ProfessionalRow } from "./ProfessionalRow";

interface AdminProfessional {
  id: string;
  isActive: boolean;
  user: { id: string; name: string; email: string };
}

export default async function ProfessionalsPage() {
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";

  const professionals = await authedFetch<AdminProfessional[]>("/professionals").catch(() => []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
        Profissionais
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Cada profissional tem a própria agenda e horário de trabalho.
      </p>

      {isOwner ? (
        <div className="mt-6">
          <CreateProfessionalForm />
        </div>
      ) : null}

      {professionals.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500 dark:text-stone-400">
          Nenhum profissional cadastrado ainda.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {professionals.map((professional) => (
            <ProfessionalRow
              key={professional.id}
              id={professional.id}
              name={professional.user.name}
              email={professional.user.email}
              isActive={professional.isActive}
              canManage={isOwner}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
