"use client";

import { useState, useTransition } from "react";
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
  const [error, setError] = useState<string | null>(null);

  function updateStatus(status: string) {
    startTransition(async () => {
      setError(null);
      const result = await updateWaitlistStatusAction(id, status);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-1 py-4">
      <div className="flex items-center justify-between gap-4">
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
            onClick={() => updateStatus("CONTACTED")}
            className="rounded-md px-2 py-1 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-800 disabled:opacity-50 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-200"
          >
            Marcar como contatado
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => updateStatus("RESOLVED")}
            className="rounded-md px-2 py-1 text-sm font-medium text-accent-600 transition-colors hover:bg-accent-50 disabled:opacity-50 disabled:hover:bg-transparent dark:text-accent-300 dark:hover:bg-accent-500/10"
          >
            Resolver
          </button>
        </div>
      </div>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </li>
  );
}
