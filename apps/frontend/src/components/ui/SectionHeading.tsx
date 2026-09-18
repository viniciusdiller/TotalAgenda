import { type ReactNode } from "react";

// Eyebrow + título usado em toda section da página do tenant — dá ritmo editorial
// consistente entre as sections em vez de cada uma soltar um <h2> isolado diferente.
export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-(--tenant-accent) uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 font-display text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-white">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
