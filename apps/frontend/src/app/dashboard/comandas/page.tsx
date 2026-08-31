import Link from "next/link";
import { DateTime } from "luxon";
import { Receipt } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import type { Ticket } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { OpenTicketButton } from "./OpenTicketButton";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ComandasPage() {
  const session = await auth();
  if (session?.user.role === "PROFESSIONAL") {
    redirect("/dashboard");
  }

  const tickets = await authedFetch<Ticket[]>("/tickets").catch(() => []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Comandas</h1>
        <OpenTicketButton />
      </div>

      {tickets.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-white/15">
          <Receipt size={32} className="text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">
            Nenhuma comanda aberta.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/dashboard/comandas/${ticket.id}`}
                className="flex items-center justify-between gap-4 py-3.5 hover:opacity-70"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {ticket.client?.name ?? "Sem cliente"}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-stone-400">
                    {ticket.items.length} {ticket.items.length === 1 ? "item" : "itens"} · aberta{" "}
                    {DateTime.fromISO(ticket.openedAt).setLocale("pt-BR").toRelative()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {brl(ticket.totalCents)}
                  </p>
                  {ticket.dueCents > 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      falta {brl(ticket.dueCents)}
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">pago</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
