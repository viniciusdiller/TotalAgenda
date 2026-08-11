import { DateTime } from "luxon";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { authedFetch } from "@/lib/api-server";

const TIMEZONE = "America/Sao_Paulo";

interface AdminBooking {
  id: string;
  startAt: string;
  endAt: string;
  clientName: string;
  clientPhone: string;
  status: "CONFIRMED" | "CANCELED" | "COMPLETED";
  service: { name: string };
  professional: { user: { name: string } };
}

export default async function DashboardHomePage() {
  const from = DateTime.now().setZone(TIMEZONE).startOf("day").toISO()!;
  const to = DateTime.now().setZone(TIMEZONE).plus({ days: 30 }).endOf("day").toISO()!;

  const bookings = await authedFetch<AdminBooking[]>(
    `/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  ).catch(() => []);

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Agenda</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Próximos 30 dias, {confirmed.length}{" "}
        {confirmed.length === 1 ? "agendamento confirmado" : "agendamentos confirmados"}.
      </p>

      {confirmed.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-white/15">
          <CalendarBlank size={32} className="text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">
            Nenhum agendamento confirmado nos próximos 30 dias.
          </p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {confirmed.map((booking) => (
            <li key={booking.id} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {booking.clientName}
                </p>
                <p className="text-sm text-zinc-500 dark:text-stone-400">
                  {booking.service.name} com {booking.professional.user.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {DateTime.fromISO(booking.startAt)
                    .setZone(TIMEZONE)
                    .setLocale("pt-BR")
                    .toFormat("dd/LL 'às' HH:mm")}
                </p>
                <p className="text-xs text-zinc-500 dark:text-stone-400">{booking.clientPhone}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
