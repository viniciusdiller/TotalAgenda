"use client";

import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { openTicketAction } from "./actions";

export function OpenTicketButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await openTicketAction({});
            if (result && !result.ok) setError(result.error ?? "Erro.");
          })
        }
        className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
      >
        <Plus size={16} weight="bold" />
        Comanda avulsa
      </button>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
