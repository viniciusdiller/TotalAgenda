"use client";

import { DateTime } from "luxon";
import type { PublicBooking, PublicClient } from "@totalagenda/shared-types";
import { Button } from "../ui/Button";
import { ClientBookingCard } from "./ClientBookingCard";
import { logoutClientAction } from "@/app/[slug]/conta/actions";

export function ClientAccountView({
  slug,
  client,
  bookings,
}: {
  slug: string;
  client: PublicClient;
  bookings: PublicBooking[];
}) {
  const now = DateTime.now();
  const upcoming = bookings.filter(
    (b) => b.status === "CONFIRMED" && DateTime.fromISO(b.startAt) >= now,
  );
  const history = bookings.filter(
    (b) => b.status !== "CONFIRMED" || DateTime.fromISO(b.startAt) < now,
  );

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
            Olá, {client.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">{client.phone}</p>
        </div>
        <form action={logoutClientAction.bind(null, slug)}>
          <button
            type="submit"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Sair
          </button>
        </form>
      </div>

      <div className="mt-6">
        <Button variant="tenant" href={`/${slug}/agendar`}>
          Agendar de novo
        </Button>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Próximos</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">
            Nenhum agendamento futuro.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {upcoming.map((booking) => (
              <ClientBookingCard key={booking.id} slug={slug} booking={booking} />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Histórico</h2>
          <div className="mt-3 flex flex-col gap-3">
            {history.map((booking) => (
              <ClientBookingCard key={booking.id} slug={slug} booking={booking} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
