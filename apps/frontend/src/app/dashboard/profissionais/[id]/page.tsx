import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { WorkingHoursEditor } from "./WorkingHoursEditor";
import { ServiceLinks } from "./ServiceLinks";
import { TimeBlocksManager } from "./TimeBlocksManager";
import type { WorkingHoursInterval } from "./actions";

interface ProfessionalDetail {
  id: string;
  bio: string | null;
  isActive: boolean;
  user: { name: string; email: string };
  workingHours: { weekday: string; startMinute: number; endMinute: number }[];
}

interface ServiceOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface ProfessionalServiceLink {
  serviceId: string;
  isActive: boolean;
}

interface TimeBlockItem {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

export default async function ProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const canManage = session?.user.role === "OWNER";
  const canViewOwnSchedule = session?.user.professionalId === id;

  if (!canManage && !canViewOwnSchedule) {
    return (
      <div>
        <p className="text-sm text-zinc-500 dark:text-stone-400">
          Você não tem acesso a esta página.
        </p>
      </div>
    );
  }

  const [professional, services, links, blocks] = await Promise.all([
    authedFetch<ProfessionalDetail>(`/professionals/${id}`),
    authedFetch<ServiceOption[]>("/services"),
    authedFetch<ProfessionalServiceLink[]>(`/professionals/${id}/services`),
    authedFetch<TimeBlockItem[]>(`/time-blocks?professionalId=${id}`),
  ]);

  const linkedServiceIds = links.filter((link) => link.isActive).map((link) => link.serviceId);
  const activeServices = services.filter((service) => service.isActive);

  const workingHoursForEditor: WorkingHoursInterval[] = professional.workingHours.map((wh) => ({
    weekday: wh.weekday,
    startMinute: wh.startMinute,
    endMinute: wh.endMinute,
  }));

  return (
    <div>
      <Link
        href="/dashboard/profissionais"
        className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200"
      >
        <ArrowLeft size={16} />
        Profissionais
      </Link>

      <h1 className="mt-3 font-display text-2xl font-bold text-zinc-900 dark:text-white">
        {professional.user.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">{professional.user.email}</p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
          Horário de trabalho
        </h2>
        <div className="mt-3">
          <WorkingHoursEditor professionalId={id} initialIntervals={workingHoursForEditor} />
        </div>
      </section>

      {canManage ? (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
            Serviços que realiza
          </h2>
          <div className="mt-3">
            <ServiceLinks
              professionalId={id}
              services={activeServices}
              linkedServiceIds={linkedServiceIds}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
          Bloqueios (folga, almoço, férias)
        </h2>
        <div className="mt-3">
          <TimeBlocksManager professionalId={id} blocks={blocks} />
        </div>
      </section>
    </div>
  );
}
