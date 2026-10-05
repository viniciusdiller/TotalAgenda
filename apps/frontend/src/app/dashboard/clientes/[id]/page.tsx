import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import type { AdminClientDetail } from "@totalagenda/shared-types";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { ClientForm } from "../ClientForm";
import { HowItWorks, FieldHint } from "@/components/ui/HowItWorks";
import { IntakeSection } from "./IntakeSection";
import { updateClientAction, listIntakeFormsAction } from "../actions";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Pendente",
  CONFIRMED: "Confirmado",
  IN_SERVICE: "Em atendimento",
  COMPLETED: "Finalizado",
  NO_SHOW: "Faltou",
  CANCELED: "Cancelado",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let client: AdminClientDetail;
  try {
    client = await authedFetch<AdminClientDetail>(`/clients/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) notFound();
    throw err;
  }
  const forms = await listIntakeFormsAction();

  const updateAction = updateClientAction.bind(null, id);

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/clientes"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white"
      >
        <CaretLeft size={14} />
        Clientes
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white">
        {client.name}
      </h1>

      <HowItWorks>
        <p>Esta é a ficha deste cliente no seu negócio. Ela tem três partes:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Cadastro:</strong> contato e dados pessoais. Altere e clique em “Salvar alterações”.</li>
          <li><strong>Anamnese:</strong> as fichas que você criou em Fichas. Cada uma pode ser preenchida e atualizada aqui.</li>
          <li><strong>Histórico:</strong> todos os atendimentos dele aqui (só leitura), com profissional e status.</li>
        </ul>
        <p>Esta ficha é só do seu negócio: outros negócios não veem o que você escreve aqui.</p>
      </HowItWorks>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Cadastro</h2>
        <div className="mt-3">
          <ClientForm action={updateAction} client={client} submitLabel="Salvar alterações" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Anamnese</h2>
        <FieldHint>Perguntas de saúde e preferências feitas pela equipe. Clique em “Preencher” ou “Editar” em cada ficha.</FieldHint>
        <div className="mt-3">
          <IntakeSection clientId={client.id} forms={forms} responses={client.intakeResponses} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Histórico ({client.appointments.length})
        </h2>
        <FieldHint>Atendimentos já feitos ou marcados. Para mudar um, use a Agenda.</FieldHint>
        {client.appointments.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">Nenhum atendimento.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
            {client.appointments.map((appointment) => (
              <li key={appointment.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {appointment.items.map((i) => i.service.name).join(", ")}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-stone-400">
                    {appointment.professional.user.name} ·{" "}
                    {STATUS_LABEL[appointment.status] ?? appointment.status}
                  </p>
                </div>
                <p className="text-right text-xs text-zinc-500 dark:text-stone-400">
                  {DateTime.fromISO(appointment.startAt)
                    .setLocale("pt-BR")
                    .toFormat("dd/LL/yyyy HH:mm")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
