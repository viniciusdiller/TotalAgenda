import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
