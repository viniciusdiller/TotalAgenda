"use client";

import { useState, useTransition } from "react";
import { DateTime } from "luxon";
import { X } from "@phosphor-icons/react/dist/ssr";
import type { PublicBooking } from "@totalagenda/shared-types";
import {
  cancelAppointmentAction,
  rescheduleAppointmentAction,
  setAppointmentStatusAction,
} from "./actions";
import { openTicketAction } from "../comandas/actions";

const TIMEZONE = "America/Sao_Paulo";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Pendente",
  CONFIRMED: "Confirmado",
  IN_SERVICE: "Em atendimento",
  COMPLETED: "Finalizado",
  NO_SHOW: "Faltou",
  CANCELED: "Cancelado",
};

// Próximos status oferecidos como botão a partir do atual.
const NEXT_STATUSES: Record<string, Array<"CONFIRMED" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW">> = {
  SCHEDULED: ["CONFIRMED", "NO_SHOW"],
  CONFIRMED: ["IN_SERVICE", "NO_SHOW"],
  IN_SERVICE: ["COMPLETED"],
  NO_SHOW: ["CONFIRMED"],
};

export function AppointmentPanel({
  appointment,
  canManage,
  onClose,
  onChanged,
}: {
  appointment: PublicBooking;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");

  const total = (appointment.priceCentsSnapshot / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) onChanged();
      else setError(result.error ?? "Erro.");
    });
  }

  const nextStatuses = NEXT_STATUSES[appointment.status] ?? [];
  const canCancel = !["CANCELED", "COMPLETED"].includes(appointment.status);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-900/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-sm flex-col bg-white p-6 shadow-xl dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-lg font-bold text-zinc-900 dark:text-white">
              {appointment.clientName}
            </p>
            <p className="text-sm text-zinc-500 dark:text-stone-400">{appointment.clientPhone}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <span className="mt-3 w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-white/5 dark:text-stone-300">
          {STATUS_LABEL[appointment.status] ?? appointment.status}
        </span>

        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-400">Horário</dt>
            <dd className="font-medium text-zinc-900 capitalize dark:text-white">
              {DateTime.fromISO(appointment.startAt)
                .setZone(TIMEZONE)
                .setLocale("pt-BR")
                .toFormat("cccc, d LLL 'às' HH:mm")}
              {" – "}
              {DateTime.fromISO(appointment.endAt).setZone(TIMEZONE).toFormat("HH:mm")}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-400">Profissional</dt>
            <dd className="font-medium text-zinc-900 dark:text-white">
              {appointment.professional?.user.name}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-400">Serviços</dt>
            <dd className="font-medium text-zinc-900 dark:text-white">
              <ul>
                {(appointment.items ?? []).map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span>{item.serviceName}</span>
                    <span className="text-zinc-500">
                      {(item.priceCentsSnapshot / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 dark:border-white/10">
            <dt className="text-zinc-400">Total</dt>
            <dd className="font-semibold text-zinc-900 dark:text-white">{total}</dd>
          </div>
          {appointment.notes ? (
            <div>
              <dt className="text-zinc-400">Observações</dt>
              <dd className="text-zinc-700 dark:text-stone-300">{appointment.notes}</dd>
            </div>
          ) : null}
        </dl>

        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        {canManage ? (
          <div className="mt-auto space-y-3 pt-6">
            {nextStatuses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(() => setAppointmentStatusAction(appointment.id, status))
                    }
                    className="rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
                  >
                    {STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            ) : null}

            {["SCHEDULED", "CONFIRMED"].includes(appointment.status) ? (
              <div className="flex items-end gap-2">
                <label className="flex-1 text-xs text-zinc-500 dark:text-stone-400">
                  Remarcar para
                  <input
                    type="datetime-local"
                    value={rescheduleValue}
                    onChange={(e) => setRescheduleValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-white/15 dark:bg-zinc-900 dark:text-white"
                  />
                </label>
                <button
                  type="button"
                  disabled={isPending || !rescheduleValue}
                  onClick={() =>
                    run(() =>
                      rescheduleAppointmentAction(
                        appointment.id,
                        DateTime.fromISO(rescheduleValue, { zone: TIMEZONE }).toISO()!,
                      ),
                    )
                  }
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-white/15 dark:text-stone-200"
                >
                  Mover
                </button>
              </div>
            ) : null}

            {["CONFIRMED", "IN_SERVICE", "COMPLETED"].includes(appointment.status) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    await openTicketAction({ appointmentId: appointment.id });
                    return { ok: true };
                  })
                }
                className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-white/15 dark:text-stone-200"
              >
                Abrir comanda
              </button>
            ) : null}

            {canCancel ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => cancelAppointmentAction(appointment.id))}
                className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/20 dark:text-red-400"
              >
                Cancelar atendimento
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
