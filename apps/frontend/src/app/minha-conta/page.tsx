import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import type { ConsumerMe, PublicBooking } from "@totalagenda/shared-types";
import { consumerAuthedFetch } from "@/lib/consumer-session";
import { formatPhoneBR } from "@/lib/masks";
import { ConsumerBookingCard } from "@/components/consumer-account/ConsumerBookingCard";
import { PasswordForm, ProfileForm } from "@/components/consumer-account/ProfileForm";
import { logoutConsumerAction } from "./actions";

export const metadata: Metadata = { title: "Minha conta - TotalAgenda" };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default async function MinhaContaPage() {
  const [me, bookings] = await Promise.all([
    consumerAuthedFetch<ConsumerMe>("/public/consumer/me").catch(() => null),
    consumerAuthedFetch<PublicBooking[]>("/public/consumer/bookings").catch(() => null),
  ]);

  if (!me || !bookings) {
    redirect("/entrar?next=/minha-conta");
  }

  const now = DateTime.now();
  const upcoming = bookings
    .filter((b) => b.status === "CONFIRMED" && DateTime.fromISO(b.startAt) >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const history = bookings.filter((b) => !upcoming.includes(b));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-brand text-2xl font-bold text-zinc-900 dark:text-white">
            Olá, {me.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
            {formatPhoneBR(me.phone)}
            {me.email ? ` · ${me.email}` : ""}
          </p>
        </div>
        <form action={logoutConsumerAction}>
          <button
            type="submit"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Sair
          </button>
        </form>
      </div>

      <section className="mt-10">
        <h2 className="font-brand text-lg font-bold text-zinc-900 dark:text-white">Próximos agendamentos</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">Nenhum agendamento futuro.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {upcoming.map((booking) => (
              <ConsumerBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-brand text-lg font-bold text-zinc-900 dark:text-white">Histórico</h2>
          <div className="mt-3 flex flex-col gap-3">
            {history.map((booking) => (
              <ConsumerBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      ) : null}

      {me.establishments.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-brand text-lg font-bold text-zinc-900 dark:text-white">Salões que você visitou</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {me.establishments.map((establishment) => (
              <li key={establishment.slug}>
                <Link
                  href={`/${establishment.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-4 transition-colors hover:border-(--tenant-accent)/40 dark:border-white/10"
                >
                  {establishment.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${API_URL}${establishment.logoUrl}`}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--tenant-accent)/10 font-brand text-sm font-bold text-(--tenant-accent)">
                      {establishment.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-white">
                    {establishment.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <ProfileForm name={me.name} email={me.email} phone={me.phone} />
        <PasswordForm />
      </section>
    </main>
  );
}
