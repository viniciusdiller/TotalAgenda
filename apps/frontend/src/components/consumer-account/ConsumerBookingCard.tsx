"use client";

import { useRef, useState, useTransition } from "react";
import { DateTime } from "luxon";
import type { AvailableSlot, PublicBooking } from "@totalagenda/shared-types";
import { publicApi } from "@/lib/api";
import { Button } from "../ui/Button";
import { DateTimeStep } from "../booking/DateTimeStep";
import { WaitlistForm } from "../booking/WaitlistForm";
import { joinWaitlistAction } from "@/app/[slug]/agendar/actions";
import { cancelMyBookingAction, rescheduleMyBookingAction } from "@/app/minha-conta/actions";

const TIMEZONE = "America/Sao_Paulo";

// A lista da conta cruza vários salões: o slug do salão de cada atendimento vem do próprio
// atendimento (booking.tenant), nunca de uma rota.
export function ConsumerBookingCard({ booking }: { booking: PublicBooking }) {
  const slug = booking.tenant?.slug ?? "";
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() =>
    DateTime.now().setZone(TIMEZONE).toISODate()!,
  );
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const slotsRequestRef = useRef(0);

  const formattedDate = DateTime.fromISO(booking.startAt)
    .setZone(TIMEZONE)
    .setLocale("pt-BR")
    .toFormat("cccc, d 'de' LLLL 'às' HH:mm");

  const isPast = DateTime.fromISO(booking.startAt) < DateTime.now();
  const canManage = booking.status === "CONFIRMED" && !isPast;

  function loadSlots(date: string) {
    const requestId = ++slotsRequestRef.current;
    setIsLoadingSlots(true);
    setSlotsError(false);
    publicApi
      .getAvailability(slug, booking.professionalId, booking.serviceId, date)
      .then((result) => {
        if (slotsRequestRef.current !== requestId) return;
        setSlots(result);
      })
      .catch(() => {
        if (slotsRequestRef.current !== requestId) return;
        setSlotsError(true);
      })
      .finally(() => {
        if (slotsRequestRef.current !== requestId) return;
        setIsLoadingSlots(false);
      });
  }

  function handleEnterReschedule() {
    setMode("reschedule");
    setSelectedSlot(null);
    setShowWaitlist(false);
    loadSlots(selectedDate);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setShowWaitlist(false);
    loadSlots(date);
  }

  async function handleJoinWaitlist() {
    return joinWaitlistAction(slug, {
      serviceId: booking.serviceId,
      professionalId: booking.professionalId,
      preferredDate: selectedDate,
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelMyBookingAction(booking.id);
      if (result?.error) setError(result.error);
    });
  }

  function handleConfirmReschedule() {
    if (!selectedSlot) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleMyBookingAction(booking.id, selectedSlot.startAt);
      if (result?.error) {
        setError(result.error);
      } else {
        setMode("view");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-5 dark:border-white/10">
      {mode === "view" ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              {booking.tenant ? (
                <p className="text-xs font-semibold tracking-wide text-(--tenant-accent) uppercase">
                  {booking.tenant.name}
                </p>
              ) : null}
              <p className="mt-0.5 font-display font-semibold text-zinc-900 dark:text-white">
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

          <div className="mt-4 flex flex-col gap-4">
            <DateTimeStep
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              slots={slots}
              isLoadingSlots={isLoadingSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              onJoinWaitlist={() => setShowWaitlist(true)}
              loadError={slotsError}
              onRetry={() => loadSlots(selectedDate)}
            />

            {showWaitlist ? (
              <WaitlistForm onSubmit={handleJoinWaitlist} onCancel={() => setShowWaitlist(false)} />
            ) : null}
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
