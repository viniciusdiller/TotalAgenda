import { DateTime } from "luxon";

// Datas sempre no fuso do negócio (America/Sao_Paulo), nunca no do navegador/servidor: a mesma comanda
// precisa mostrar o mesmo horário pra quem abre de qualquer lugar e não pode divergir entre o HTML do
// servidor e o do navegador (erro de hidratação).
const TZ = "America/Sao_Paulo";

function parse(iso: string | Date | null | undefined): DateTime | null {
  if (!iso) return null;
  const dt = typeof iso === "string" ? DateTime.fromISO(iso) : DateTime.fromJSDate(iso);
  return dt.isValid ? dt.setZone(TZ).setLocale("pt-BR") : null;
}

/** "06/10/2026 às 10:32" */
export function formatDateTime(iso: string | Date | null | undefined): string {
  return parse(iso)?.toFormat("dd/LL/yyyy 'às' HH:mm") ?? "—";
}

/** "06/10 10:32" — para listas compactas */
export function formatShortDateTime(iso: string | Date | null | undefined): string {
  return parse(iso)?.toFormat("dd/LL HH:mm") ?? "—";
}
