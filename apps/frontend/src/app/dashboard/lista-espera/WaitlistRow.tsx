"use client";

import { useTransition } from "react";
import { updateWaitlistStatusAction } from "./actions";

export function WaitlistRow({
  id,
  clientName,
  clientPhone,
  serviceName,
}: {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="font-medium text-zinc-900 dark:text-white">{clientName}</p>
        <p className="text-sm text-zinc-500 dark:text-stone-400">
          {serviceName} · {clientPhone}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => updateWaitlistStatusAction(id, "CONTACTED"))}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Marcar como contatado
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => updateWaitlistStatusAction(id, "RESOLVED"))}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50 dark:text-accent-300"
        >
          Resolver
        </button>
      </div>
    </li>
  );
}
