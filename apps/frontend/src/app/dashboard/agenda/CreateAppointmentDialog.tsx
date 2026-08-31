"use client";

import { useMemo, useState, useTransition } from "react";
import { DateTime } from "luxon";
import { X } from "@phosphor-icons/react/dist/ssr";
import type { CalendarProfessional } from "@totalagenda/shared-types";
import { createStaffAppointmentAction } from "./actions";

const TIMEZONE = "America/Sao_Paulo";

interface AgendaService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

export function CreateAppointmentDialog({
  professionals,
  services,
  defaultProfessionalId,
  defaultStartAt,
  onClose,
  onCreated,
}: {
  professionals: CalendarProfessional[];
  services: AgendaService[];
  defaultProfessionalId: string;
  defaultStartAt: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [professionalId, setProfessionalId] = useState(defaultProfessionalId);
  const [startAt, setStartAt] = useState(
    DateTime.fromISO(defaultStartAt).setZone(TIMEZONE).toFormat("yyyy-LL-dd'T'HH:mm"),
  );
  const [serviceIds, setServiceIds] = useState<string[]>(services[0] ? [services[0].id] : []);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalMinutes = useMemo(
    () =>
      serviceIds.reduce(
        (sum, id) => sum + (services.find((s) => s.id === id)?.durationMinutes ?? 0),
        0,
    ),
    [serviceIds, services],
  );

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit() {
    setError(null);
    if (serviceIds.length === 0) {
      setError("Selecione ao menos um serviço.");
      return;
    }
    if (!clientName.trim() || clientPhone.replace(/\D/g, "").length < 10) {
      setError("Informe nome e telefone do cliente.");
      return;
    }
    startTransition(async () => {
      const result = await createStaffAppointmentAction({
        professionalId,
        startAt: DateTime.fromISO(startAt, { zone: TIMEZONE }).toISO()!,
        items: serviceIds.map((serviceId) => ({ serviceId })),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        notes: notes.trim() || undefined,
        status: confirmed ? "CONFIRMED" : "SCHEDULED",
      });
      if (result.ok) onCreated();
      else setError(result.error ?? "Erro ao criar.");
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
            Novo atendimento
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-zinc-700 dark:text-stone-200">
            Profissional
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-zinc-700 dark:text-stone-200">
            Início
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            />
          </label>

          <div className="text-sm font-medium text-zinc-700 dark:text-stone-200">
            Serviços{" "}
            {totalMinutes > 0 ? (
              <span className="font-normal text-zinc-400">({totalMinutes} min)</span>
            ) : null}
            <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-white/10">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm font-normal">
                  <input
                    type="checkbox"
                    checked={serviceIds.includes(s.id)}
                    onChange={() => toggleService(s.id)}
                  />
                  {s.name}
                  <span className="ml-auto text-zinc-400">{s.durationMinutes} min</span>
                </label>
              ))}
            </div>
          </div>

          <label className="block text-sm font-medium text-zinc-700 dark:text-stone-200">
            Cliente
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            />
          </label>
          <input
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="Telefone (DDD + número)"
            inputMode="tel"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações (opcional)"
            rows={2}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          />

          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-stone-300">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Já confirmado (senão entra como pendente)
          </label>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-white/15 dark:text-stone-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="flex-1 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Criar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
