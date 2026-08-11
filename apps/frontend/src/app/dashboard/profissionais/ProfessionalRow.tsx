"use client";

import { useTransition } from "react";
import clsx from "clsx";
import { toggleProfessionalActiveAction } from "./actions";

export function ProfessionalRow({
  id,
  name,
  email,
  isActive,
  canManage,
}: {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="font-medium text-zinc-900 dark:text-white">{name}</p>
        <p className="text-sm text-zinc-500 dark:text-stone-400">{email}</p>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            isActive
              ? "bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300"
              : "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-stone-400",
          )}
        >
          {isActive ? "Ativo" : "Inativo"}
        </span>

        {canManage ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => toggleProfessionalActiveAction(id, !isActive))}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:text-stone-400 dark:hover:text-stone-200"
          >
            {isActive ? "Desativar" : "Ativar"}
          </button>
        ) : null}
      </div>
    </li>
  );
}
