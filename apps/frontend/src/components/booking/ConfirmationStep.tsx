import { DateTime } from "luxon";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { PublicBooking } from "@totalagenda/shared-types";
import { Button } from "../ui/Button";

const TIMEZONE = "America/Sao_Paulo";

export function ConfirmationStep({ booking }: { booking: PublicBooking }) {
  const formattedDate = DateTime.fromISO(booking.startAt)
    .setZone(TIMEZONE)
    .setLocale("pt-BR")
    .toFormat("cccc, d 'de' LLLL 'às' HH:mm");

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <CheckCircle size={56} weight="fill" className="text-(--tenant-accent)" />
      <h2 className="mt-5 font-display text-2xl font-bold text-zinc-900 dark:text-white">
        Agendamento confirmado
      </h2>
      <p className="mt-2 max-w-sm text-[15px] text-zinc-600 capitalize dark:text-stone-300">
        {formattedDate}
      </p>

      <div className="mt-8 w-full max-w-sm rounded-2xl border border-zinc-200 p-5 text-left dark:border-white/10">
        <p className="text-sm text-zinc-500 dark:text-stone-400">Serviço</p>
        <p className="font-medium text-zinc-900 dark:text-white">{booking.service?.name}</p>
        <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">Profissional</p>
        <p className="font-medium text-zinc-900 dark:text-white">
          {booking.professional?.user.name}
        </p>
      </div>

      <p className="mt-6 max-w-sm text-sm text-zinc-500 dark:text-stone-400">
        Guarde o link abaixo para cancelar ou remarcar quando precisar.
      </p>
      <Button href={`/agendamento/${booking.manageToken}`} variant="ghost" className="mt-3">
        Gerenciar agendamento
      </Button>
    </div>
  );
}
