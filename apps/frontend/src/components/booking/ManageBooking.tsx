"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { CalendarX, CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { AvailableSlot, PublicBooking } from "@totalagenda/shared-types";
import { publicApi, ApiError } from "@/lib/api";
import { Button } from "../ui/Button";
import { DateTimeStep } from "./DateTimeStep";

const TIMEZONE = "America/Sao_Paulo";

export function ManageBooking({ token }: { token: string }) {
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [actionError, setActionError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() =>
    DateTime.now().setZone(TIMEZONE).toISODate()!,
  );
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    publicApi
      .getBookingByToken(token)
      .then(setBooking)
      .catch(() => setLoadError(true));
  }, [token]);

  useEffect(() => {
    if (mode !== "reschedule" || !booking?.tenant?.slug) return;
    publicApi
      .getAvailability(booking.tenant.slug, booking.professionalId, booking.serviceId, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setIsLoadingSlots(false));
  }, [mode, booking, selectedDate]);

  function handleEnterReschedule() {
    setMode("reschedule");
    setSelectedSlot(null);
    setIsLoadingSlots(true);
  }

  function handleSelectRescheduleDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setIsLoadingSlots(true);
  }

  async function handleCancel() {
    setCanceling(true);
    setActionError(null);
    try {
      const updated = await publicApi.cancelBooking(token);
      setBooking(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível cancelar.");
    } finally {
      setCanceling(false);
    }
  }

  async function handleConfirmReschedule() {
    if (!selectedSlot) return;
    setRescheduling(true);
    setActionError(null);
    try {
      const updated = await publicApi.rescheduleBooking(token, selectedSlot.startAt);
      setBooking(updated);
      setMode("view");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível remarcar.");
    } finally {
      setRescheduling(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <WarningCircle size={40} className="text-zinc-400" />
        <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
          Agendamento não encontrado
        </h1>
        <p className="text-sm text-zinc-500 dark:text-stone-400">
          O link pode estar incorreto ou expirado.
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-md">
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-white/5" />
      </div>
    );
  }

  const formattedDate = DateTime.fromISO(booking.startAt)
    .setZone(TIMEZONE)
    .setLocale("pt-BR")
    .toFormat("cccc, d 'de' LLLL 'às' HH:mm");

  return (
    <div className="mx-auto w-full max-w-md">
      {booking.status === "CANCELED" ? (
        <div className="flex flex-col items-center text-center">
          <CalendarX size={48} className="text-zinc-400" />
          <h1 className="mt-4 font-display text-xl font-bold text-zinc-900 dark:text-white">
            Agendamento cancelado
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
            Esse horário não está mais reservado.
          </p>
        </div>
      ) : mode === "view" ? (
        <>
          <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
            Seu agendamento
          </h1>

          <div className="mt-5 rounded-2xl border border-zinc-200 p-5 dark:border-white/10">
            <p className="text-sm text-zinc-500 dark:text-stone-400">Serviço</p>
            <p className="font-medium text-zinc-900 dark:text-white">{booking.service?.name}</p>
            <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">Profissional</p>
            <p className="font-medium text-zinc-900 dark:text-white">
              {booking.professional?.user.name}
            </p>
            <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">Horário</p>
            <p className="font-medium text-zinc-900 capitalize dark:text-white">
              {formattedDate}
            </p>
          </div>

          {actionError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{actionError}</p>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button variant="ghost" onClick={handleEnterReschedule} className="flex-1">
              Remarcar
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={canceling}
              className="flex-1 text-red-600 ring-red-200 hover:bg-red-50 dark:text-red-400 dark:ring-red-500/20"
            >
              {canceling ? "Cancelando..." : "Cancelar"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
            Escolher novo horário
          </h1>

          <div className="mt-5">
            <DateTimeStep
              selectedDate={selectedDate}
              onSelectDate={handleSelectRescheduleDate}
              slots={slots}
              isLoadingSlots={isLoadingSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              onJoinWaitlist={() => {}}
            />
          </div>

          {actionError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{actionError}</p>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button variant="ghost" onClick={() => setMode("view")} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReschedule}
              disabled={!selectedSlot || rescheduling}
              className="flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rescheduling ? "Salvando..." : "Confirmar novo horário"}
            </Button>
          </div>
        </>
      )}

      {booking.status === "CONFIRMED" && mode === "view" ? (
        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-zinc-400 dark:text-stone-500">
          <CheckCircle size={14} />
          Agendamento confirmado
        </p>
      ) : null}
    </div>
  );
}
