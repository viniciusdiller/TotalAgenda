import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
}: {
  icon: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-white/15">
      <IconComponent size={32} weight="light" className="text-zinc-300 dark:text-stone-600" />
      <div>
        <p className="text-sm font-medium text-zinc-700 dark:text-stone-200">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
