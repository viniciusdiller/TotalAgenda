import Link from "next/link";
import { DateTime } from "luxon";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react/dist/ssr";
import type { AdminClientListItem } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (session?.user.role === "PROFESSIONAL") {
    return (
      <p className="text-sm text-zinc-500 dark:text-stone-400">
        Apenas o dono e a recepção acessam a base de clientes.
      </p>
    );
  }

  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const clients = await authedFetch<AdminClientListItem[]>(
    `/clients${query ? `?search=${encodeURIComponent(query)}` : ""}`,
  ).catch(() => []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Clientes</h1>
        <Link
          href="/dashboard/clientes/novo"
          className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          <Plus size={16} weight="bold" />
          Novo cliente
        </Link>
      </div>

      <form className="mt-6 flex max-w-sm items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 dark:border-white/15">
        <MagnifyingGlass size={16} className="text-zinc-400" />
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por nome ou telefone"
          className="w-full bg-transparent text-sm text-zinc-900 outline-none dark:text-white"
        />
      </form>

      {clients.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500 dark:text-stone-400">
          {query ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/dashboard/clientes/${client.id}`}
                className="flex items-center justify-between gap-4 py-3.5 hover:opacity-70"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">{client.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-stone-400">
                    {client.phone}
                    {client.email ? ` · ${client.email}` : ""}
                  </p>
                  {client.tags.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {client.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700 dark:bg-accent-500/10 dark:text-accent-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <p>
                    {client._count.appointments}{" "}
                    {client._count.appointments === 1 ? "atendimento" : "atendimentos"}
                  </p>
                  <p>desde {DateTime.fromISO(client.createdAt).setLocale("pt-BR").toFormat("LLL yyyy")}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
