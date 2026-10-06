import type { ReactNode } from "react";

// Quadro de indicador (rótulo + valor + dica opcional). Usado no Financeiro e em Comissões.
// `tone` colore só a dica: "warn" para algo que pede atenção (vencido, a pagar), "muted" para apoio.
export function Card({
  label,
  value,
  hint,
  tone = "warn",
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "warn" | "muted";
}) {
  return (
    <div className="hover-lift rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">{value}</p>
      {hint ? (
        <p
          className={
            tone === "warn"
              ? "text-xs text-amber-600 dark:text-amber-400"
              : "text-xs text-zinc-400 dark:text-stone-500"
          }
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
