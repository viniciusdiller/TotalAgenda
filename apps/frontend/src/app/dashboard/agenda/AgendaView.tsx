"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { DateTime } from "luxon";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import type {
  CalendarResponse,
  PublicBooking,
  StaffRole,
} from "@totalagenda/shared-types";
import { fetchCalendarAction } from "./actions";
import { AppointmentPanel } from "./AppointmentPanel";
import { CreateAppointmentDialog } from "./CreateAppointmentDialog";

const TIMEZONE = "America/Sao_Paulo";
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;
const PX_PER_MIN = 1.1;
const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

interface AgendaService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  CONFIRMED:
    "border-accent-300 bg-accent-50 text-accent-800 dark:border-accent-500/40 dark:bg-accent-500/10 dark:text-accent-200",
  IN_SERVICE:
    "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200",
  COMPLETED:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  NO_SHOW:
    "border-zinc-300 bg-zinc-100 text-zinc-500 line-through dark:border-white/15 dark:bg-white/5",
  CANCELED:
    "border-zinc-200 bg-zinc-50 text-zinc-400 line-through dark:border-white/10 dark:bg-white/[0.03]",
};

function minutesFromDayStart(iso: string, day: string) {
  const dayStart = DateTime.fromISO(day, { zone: TIMEZONE }).startOf("day");
  return DateTime.fromISO(iso).setZone(TIMEZONE).diff(dayStart, "minutes").minutes;
}

const GRID_TOP_MIN = DAY_START_HOUR * 60;
const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * 60 * PX_PER_MIN;

export function AgendaView({
  initialDate,
  initialCalendar,
  services,
  role,
}: {
  initialDate: string;
  initialCalendar: CalendarResponse;
  services: AgendaService[];
  role: StaffRole;
}) {
  const [date, setDate] = useState(initialDate);
  const [calendar, setCalendar] = useState(initialCalendar);
  const [professionalFilter, setProfessionalFilter] = useState<string>("");
  const [selected, setSelected] = useState<PublicBooking | null>(null);
  const [createAt, setCreateAt] = useState<{ professionalId: string; startAt: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = role === "OWNER" || role === "RECEPTIONIST" || role === "PROFESSIONAL";

  const reload = useCallback(
    (nextDate: string, nextFilter: string) => {
      const from = DateTime.fromISO(nextDate, { zone: TIMEZONE }).startOf("day").toISO()!;
      const to = DateTime.fromISO(nextDate, { zone: TIMEZONE }).endOf("day").toISO()!;
      startTransition(async () => {
        const data = await fetchCalendarAction(from, to, nextFilter || undefined);
        setCalendar(data);
        setSelected(null);
      });
    },
    [],
  );

  function shiftDay(days: number) {
    const next = DateTime.fromISO(date, { zone: TIMEZONE }).plus({ days }).toISODate()!;
    setDate(next);
    reload(next, professionalFilter);
  }

  function goToday() {
    const today = DateTime.now().setZone(TIMEZONE).toISODate()!;
    setDate(today);
    reload(today, professionalFilter);
  }

  const weekday = WEEKDAYS[DateTime.fromISO(date, { zone: TIMEZONE }).weekday % 7];

  const columns = useMemo(
    () =>
      calendar.professionals.filter(
        (p) => !professionalFilter || p.id === professionalFilter,
      ),
    [calendar.professionals, professionalFilter],
  );

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) list.push(h);
    return list;
  }, []);

  function handleColumnClick(professionalId: string, event: React.MouseEvent<HTMLDivElement>) {
    if (!canManage) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetMin = (event.clientY - rect.top) / PX_PER_MIN;
    const snapped = Math.round((GRID_TOP_MIN + offsetMin) / 15) * 15;
    const startAt = DateTime.fromISO(date, { zone: TIMEZONE })
      .startOf("day")
      .plus({ minutes: snapped })
      .toISO()!;
    setCreateAt({ professionalId, startAt });
  }

  const prettyDate = DateTime.fromISO(date, { zone: TIMEZONE })
    .setLocale("pt-BR")
    .toFormat("cccc, d 'de' LLLL");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Agenda</h1>
          <p className="mt-1 text-sm text-zinc-500 capitalize dark:text-stone-400">{prettyDate}</p>
        </div>

        <div className="flex items-center gap-2">
          {calendar.professionals.length > 1 ? (
            <select
              value={professionalFilter}
              onChange={(e) => {
                setProfessionalFilter(e.target.value);
                reload(date, e.target.value);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            >
              <option value="">Todos os profissionais</option>
              {calendar.professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : null}

          <div className="flex items-center rounded-lg border border-zinc-300 dark:border-white/15">
            <button
              type="button"
              onClick={() => shiftDay(-1)}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              aria-label="Dia anterior"
            >
              <CaretLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="border-x border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-white/15 dark:text-stone-200"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => shiftDay(1)}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              aria-label="Próximo dia"
            >
              <CaretRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500 dark:text-stone-400">
          Nenhum profissional ativo. Cadastre profissionais para usar a agenda.
        </p>
      ) : (
        <div
          className={clsx(
            "mt-6 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-white/10",
            isPending && "opacity-60",
          )}
        >
          <div className="flex min-w-max">
            {/* Gutter de horas */}
            <div className="w-14 shrink-0 border-r border-zinc-200 dark:border-white/10">
              <div className="h-10 border-b border-zinc-200 dark:border-white/10" />
              <div className="relative" style={{ height: GRID_HEIGHT }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-xs text-zinc-400"
                    style={{ top: (h * 60 - GRID_TOP_MIN) * PX_PER_MIN }}
                  >
                    {String(h).padStart(2, "0")}h
                  </div>
                ))}
              </div>
            </div>

            {columns.map((professional) => {
              const dayHours = professional.workingHours.filter((w) => w.weekday === weekday);
              const appts = calendar.appointments.filter(
                (a) => a.professionalId === professional.id,
              );
              const blocks = calendar.timeBlocks.filter(
                (b) => b.professionalId === professional.id,
              );

              return (
                <div
                  key={professional.id}
                  className="w-56 shrink-0 border-r border-zinc-200 last:border-r-0 dark:border-white/10"
                >
                  <div className="flex h-10 items-center justify-center border-b border-zinc-200 px-2 text-sm font-medium text-zinc-900 dark:border-white/10 dark:text-white">
                    <span className="truncate">{professional.name}</span>
                  </div>

                  <div
                    className="relative bg-zinc-50/50 dark:bg-white/[0.015]"
                    style={{ height: GRID_HEIGHT }}
                    onClick={(e) => handleColumnClick(professional.id, e)}
                  >
                    {/* Faixas de horário de trabalho */}
                    {dayHours.map((w, i) => (
                      <div
                        key={i}
                        className="absolute inset-x-0 bg-white dark:bg-white/[0.03]"
                        style={{
                          top: (w.startMinute - GRID_TOP_MIN) * PX_PER_MIN,
                          height: (w.endMinute - w.startMinute) * PX_PER_MIN,
                        }}
                      />
                    ))}

                    {/* Linhas de hora */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-zinc-200/70 dark:border-white/5"
                        style={{ top: (h * 60 - GRID_TOP_MIN) * PX_PER_MIN }}
                      />
                    ))}

                    {/* Bloqueios */}
                    {blocks.map((b) => {
                      const top = (minutesFromDayStart(b.startAt, date) - GRID_TOP_MIN) * PX_PER_MIN;
                      const height =
                        (minutesFromDayStart(b.endAt, date) -
                          minutesFromDayStart(b.startAt, date)) *
                        PX_PER_MIN;
                      return (
                        <div
                          key={b.id}
                          className="absolute inset-x-1 rounded-md bg-[repeating-linear-gradient(45deg,rgba(120,120,120,0.15)_0_6px,transparent_6px_12px)] px-2 py-1 text-[11px] text-zinc-500"
                          style={{ top, height }}
                        >
                          {b.reason ?? "Bloqueado"}
                        </div>
                      );
                    })}

                    {/* Atendimentos */}
                    {appts.map((a) => {
                      const top = (minutesFromDayStart(a.startAt, date) - GRID_TOP_MIN) * PX_PER_MIN;
                      const height = Math.max(
                        22,
                        (minutesFromDayStart(a.endAt, date) -
                          minutesFromDayStart(a.startAt, date)) *
                          PX_PER_MIN,
                      );
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(a);
                          }}
                          className={clsx(
                            "absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] leading-tight",
                            STATUS_STYLES[a.status] ?? STATUS_STYLES.CONFIRMED,
                          )}
                          style={{ top, height }}
                        >
                          <span className="block font-semibold">
                            {DateTime.fromISO(a.startAt).setZone(TIMEZONE).toFormat("HH:mm")}{" "}
                            {a.clientName}
                          </span>
                          <span className="block truncate opacity-80">
                            {a.items?.map((i) => i.serviceName).join(", ") ?? a.service?.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {canManage ? (
        <button
          type="button"
          onClick={() => {
            const first = columns[0];
            if (!first) return;
            setCreateAt({
              professionalId: first.id,
              startAt: DateTime.fromISO(date, { zone: TIMEZONE })
                .startOf("day")
                .plus({ hours: 9 })
                .toISO()!,
            });
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          <Plus size={16} weight="bold" />
          Novo atendimento
        </button>
      ) : null}

      {selected ? (
        <AppointmentPanel
          appointment={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onChanged={() => reload(date, professionalFilter)}
        />
      ) : null}

      {createAt ? (
        <CreateAppointmentDialog
          professionals={calendar.professionals}
          services={services}
          defaultProfessionalId={createAt.professionalId}
          defaultStartAt={createAt.startAt}
          onClose={() => setCreateAt(null)}
          onCreated={() => {
            setCreateAt(null);
            reload(date, professionalFilter);
          }}
        />
      ) : null}
    </div>
  );
}
