"use client";

import { DateTime } from "luxon";
import clsx from "clsx";
import type { AvailableSlot } from "@totalagenda/shared-types";

const TIMEZONE = "America/Sao_Paulo";
const DAYS_AHEAD = 14;

function buildDateOptions() {
  const today = DateTime.now().setZone(TIMEZONE).startOf("day");
  return Array.from({ length: DAYS_AHEAD }, (_, i) => today.plus({ days: i }));
}

export function DateTimeStep({
  selectedDate,
  onSelectDate,
  slots,
  isLoadingSlots,
  selectedSlot,
  onSelectSlot,
  onJoinWaitlist,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  slots: AvailableSlot[];
  isLoadingSlots: boolean;
  selectedSlot: AvailableSlot | null;
  onSelectSlot: (slot: AvailableSlot) => void;
  onJoinWaitlist: () => void;
}) {
  const dateOptions = buildDateOptions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-stone-200">Escolha o dia</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dateOptions.map((day) => {
            const iso = day.toISODate()!;
            const isSelected = iso === selectedDate;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelectDate(iso)}
                className={clsx(
                  "flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-2xl border py-3 transition-colors",
                  isSelected
                    ? "border-accent-500 bg-accent-50 text-accent-700 dark:border-accent-400 dark:bg-accent-500/10 dark:text-accent-300"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-stone-300",
                )}
              >
                <span className="text-[11px] font-medium uppercase">
                  {day.setLocale("pt-BR").toFormat("ccc")}
                </span>
                <span className="font-display text-lg font-bold">{day.toFormat("dd")}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-stone-200">
          Horários disponíveis
        </p>

        {isLoadingSlots ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5"
              />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center dark:border-white/15">
            <p className="text-sm text-zinc-600 dark:text-stone-300">
              Não há horários livres neste dia.
            </p>
            <button
              type="button"
              onClick={onJoinWaitlist}
              className="mt-3 text-sm font-semibold text-accent-600 hover:text-accent-700 dark:text-accent-300"
            >
              Entrar na lista de espera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const isSelected = slot.startAt === selectedSlot?.startAt;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  className={clsx(
                    "rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                    isSelected
                      ? "border-accent-500 bg-accent-500 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-stone-200",
                  )}
                >
                  {DateTime.fromISO(slot.startAt).setZone(TIMEZONE).toFormat("HH:mm")}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
