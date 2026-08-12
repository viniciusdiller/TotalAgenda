"use client";

import { useState, useTransition } from "react";
import { DateTime } from "luxon";
import type { AvailableSlot, PublicBooking } from "@totalagenda/shared-types";
import { publicApi } from "@/lib/api";
import { Button } from "../ui/Button";
import { DateTimeStep } from "../booking/DateTimeStep";
import { cancelMyBookingAction, rescheduleMyBookingAction } from "@/app/[slug]/conta/actions";

const TIMEZONE = "America/Sao_Paulo";

export function ClientBookingCard({ slug, booking }: { slug: string; booking: PublicBooking }) {
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() =>
    DateTime.now().setZone(TIMEZONE).toISODate()!,
  );
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const formattedDate = DateTime.fromISO(booking.startAt)
    .setZone(TIMEZONE)
    .setLocale("pt-BR")
    .toFormat("cccc, d 'de' LLLL 'às' HH:mm");

  const isPast = DateTime.fromISO(booking.startAt) < DateTime.now();
  const canManage = booking.status === "CONFIRMED" && !isPast;

  function loadSlots(date: string) {
    setIsLoadingSlots(true);
    publicApi
      .getAvailability(slug, booking.professionalId, booking.serviceId, date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setIsLoadingSlots(false));
  }

  function handleEnterReschedule() {
    setMode("reschedule");
    setSelectedSlot(null);
    loadSlots(selectedDate);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    loadSlots(date);
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      try {
        await cancelMyBookingAction(slug, booking.id);
      } catch {
        setError("Não foi possível cancelar.");
      }
    });
  }

  function handleConfirmReschedule() {
    if (!selectedSlot) return;
    setError(null);
    startTransition(async () => {
      try {
        await rescheduleMyBookingAction(slug, booking.id, selectedSlot.startAt);
        setMode("view");
      } catch {
        setError("Não foi possível remarcar.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-5 dark:border-white/10">
      {mode === "view" ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display font-semibold text-zinc-900 dark:text-white">
                {booking.service?.name}
              </p>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-stone-400">
                Com {booking.professional?.user.name}
              </p>
              <p className="mt-1 text-sm text-zinc-600 capitalize dark:text-stone-300">
                {formattedDate}
              </p>
            </div>
            <span
              className={
                booking.status === "CANCELED"
                  ? "shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-white/5 dark:text-stone-400"
                  : "shrink-0 rounded-full bg-(--tenant-accent)/10 px-2.5 py-1 text-xs font-medium text-(--tenant-accent)"
              }
            >
              {booking.status === "CANCELED" ? "Cancelado" : "Confirmado"}
            </span>
          </div>

          {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          {canManage ? (
            <div className="mt-4 flex gap-3">
              <Button variant="ghost" onClick={handleEnterReschedule} className="flex-1 text-sm">
                Remarcar
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={pending}
                className="flex-1 text-sm text-red-600 ring-red-200 hover:bg-red-50 dark:text-red-400 dark:ring-red-500/20"
              >
                {pending ? "Cancelando..." : "Cancelar"}
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="font-display font-semibold text-zinc-900 dark:text-white">
            Escolher novo horário
          </p>

          <div className="mt-4">
            <DateTimeStep
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              slots={slots}
              isLoadingSlots={isLoadingSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              onJoinWaitlist={() => {}}
            />
          </div>

          {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          <div className="mt-4 flex gap-3">
            <Button variant="ghost" onClick={() => setMode("view")} className="flex-1 text-sm">
              Voltar
            </Button>
            <Button
              variant="tenant"
              onClick={handleConfirmReschedule}
              disabled={!selectedSlot || pending}
              className="flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
