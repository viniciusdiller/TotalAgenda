import { DateTime } from "luxon";

export const EARNINGS_TIMEZONE = "America/Sao_Paulo";
const MAX_RANGE_DAYS = 366;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type PeriodPreset = "hoje" | "7d" | "mes" | "mes-passado" | "custom";

export const PRESET_LABEL: Record<Exclude<PeriodPreset, "custom">, string> = {
  hoje: "Hoje",
  "7d": "7 dias",
  mes: "Este mês",
  "mes-passado": "Mês passado",
};

export interface EarningsPeriod {
  preset: PeriodPreset;
  /** ISO com fuso de São Paulo, início do primeiro dia. Vai pro backend. */
  from: string;
  /** ISO com fuso de São Paulo, fim do último dia. Vai pro backend. */
  to: string;
  /** yyyy-MM-dd, para preencher os <input type="date">. */
  fromDate: string;
  toDate: string;
}

function build(preset: PeriodPreset, start: DateTime, end: DateTime): EarningsPeriod {
  return {
    preset,
    from: start.startOf("day").toISO()!,
    to: end.endOf("day").toISO()!,
    fromDate: start.toISODate()!,
    toDate: end.toISODate()!,
  };
}

function parseDate(value: string | undefined): DateTime | null {
  if (!value || !DATE_RE.test(value)) return null;
  const dt = DateTime.fromISO(value, { zone: EARNINGS_TIMEZONE });
  return dt.isValid ? dt : null;
}

// O período vive na URL (?periodo=… ou ?de=…&ate=…), então o link é compartilhável e a página
// continua Server Component. Qualquer valor inválido cai no mês corrente: nunca vira erro 500 nem
// manda ao backend um intervalo que ele recusaria (teto de 366 dias).
export function resolvePeriod(
  params: { periodo?: string; de?: string; ate?: string },
  now: DateTime = DateTime.now(),
): EarningsPeriod {
  const today = now.setZone(EARNINGS_TIMEZONE).startOf("day");
  const thisMonth = () => build("mes", today.startOf("month"), today.endOf("month"));

  const de = parseDate(params.de);
  const ate = parseDate(params.ate);
  if (de && ate) {
    const days = ate.diff(de, "days").days;
    if (days >= 0 && days < MAX_RANGE_DAYS) return build("custom", de, ate);
    return thisMonth();
  }

  switch (params.periodo) {
    case "hoje":
      return build("hoje", today, today);
    case "7d":
      return build("7d", today.minus({ days: 6 }), today);
    case "mes-passado": {
      const lastMonth = today.minus({ months: 1 });
      return build("mes-passado", lastMonth.startOf("month"), lastMonth.endOf("month"));
    }
    default:
      return thisMonth();
  }
}
