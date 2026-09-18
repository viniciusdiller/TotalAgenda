"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { CalendarX, CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { AvailableSlot, PublicBooking } from "@totalagenda/shared-types";
import { publicApi, ApiError } from "@/lib/api";
import { Button } from "../ui/Button";
import { DateTimeStep } from "./DateTimeStep";
import { WaitlistForm } from "./WaitlistForm";
import { joinWaitlistAction } from "@/app/[slug]/agendar/actions";

const TIMEZONE = "America/Sao_Paulo";

// Só quem ainda não começou pode ser cancelado/remarcado pelo cliente (mesma regra que o
// backend já aplica em cancelForClient/applyReschedule) — mostrar os botões pra um estado
// terminal só faz o cliente descobrir que não dá depois de tentar.
const MANAGEABLE_STATUSES = new Set(["SCHEDULED", "CONFIRMED"]);

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
  const [slotsError, setSlotsError] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const slotsRequestRef = useRef(0);

  useEffect(() => {
    publicApi
      .getBookingByToken(token)
      .then(setBooking)
      .catch(() => setLoadError(true));
  }, [token]);

  const loadSlots = useCallback(
    (date: string) => {
      if (!booking?.tenant?.slug) return;
      const requestId = ++slotsRequestRef.current;
      setIsLoadingSlots(true);
      setSlotsError(false);
      publicApi
        .getAvailability(booking.tenant.slug, booking.professionalId, booking.serviceId, date)
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
    },
    [booking],
  );

  function handleEnterReschedule() {
    setMode("reschedule");
    setSelectedSlot(null);
    setShowWaitlist(false);
    loadSlots(selectedDate);
  }

  function handleSelectRescheduleDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setShowWaitlist(false);
    loadSlots(date);
  }

  async function handleJoinWaitlist() {
    if (!booking?.tenant?.slug) return { error: "Não foi possível entrar na lista agora." };
    return joinWaitlistAction(booking.tenant.slug, {
      serviceId: booking.serviceId,
      professionalId: booking.professionalId,
      preferredDate: selectedDate,
    });
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

  const terminalStatusMessage: Record<string, { title: string; body: string }> = {
    CANCELED: { title: "Agendamento cancelado", body: "Esse horário não está mais reservado." },
    COMPLETED: { title: "Atendimento já concluído", body: "Esse agendamento já foi finalizado." },
    NO_SHOW: {
      title: "Agendamento marcado como falta",
      body: "Fale com o negócio se precisar reagendar.",
    },
  };
  const terminal = terminalStatusMessage[booking.status];

  return (
    <div className="mx-auto w-full max-w-md">
      {terminal ? (
        <div className="flex flex-col items-center text-center">
          <CalendarX size={48} className="text-zinc-400" />
          <h1 className="mt-4 font-display text-xl font-bold text-zinc-900 dark:text-white">
            {terminal.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">{terminal.body}</p>
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

          {MANAGEABLE_STATUSES.has(booking.status) ? (
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
          ) : null}
        </>
      ) : (
        <>
          <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
            Escolher novo horário
          </h1>

          <div className="mt-5 flex flex-col gap-6">
            <DateTimeStep
              selectedDate={selectedDate}
              onSelectDate={handleSelectRescheduleDate}
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

          {actionError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{actionError}</p>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button variant="ghost" onClick={() => setMode("view")} className="flex-1">
              Voltar
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
