import { DateTime } from "luxon";
import type { CalendarResponse } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { AgendaView } from "./AgendaView";
import { fetchCalendarAction } from "./actions";

const TIMEZONE = "America/Sao_Paulo";

interface AgendaService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
}

export default async function AgendaPage() {
  const session = await auth();
  const today = DateTime.now().setZone(TIMEZONE).toISODate()!;
  const from = DateTime.fromISO(today, { zone: TIMEZONE }).startOf("day").toISO()!;
  const to = DateTime.fromISO(today, { zone: TIMEZONE }).endOf("day").toISO()!;

  const [calendar, services] = await Promise.all([
    fetchCalendarAction(from, to).catch(
      () => ({ professionals: [], appointments: [], timeBlocks: [] }) as CalendarResponse,
    ),
    authedFetch<AgendaService[]>("/services").catch(() => [] as AgendaService[]),
  ]);

  return (
    <AgendaView
      initialDate={today}
      initialCalendar={calendar}
      services={services.filter((s) => s.isActive)}
      role={session?.user.role ?? "PROFESSIONAL"}
    />
  );
}
