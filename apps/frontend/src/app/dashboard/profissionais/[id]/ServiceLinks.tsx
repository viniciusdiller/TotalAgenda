"use client";

import { useState, useTransition } from "react";
import { toggleServiceLinkAction } from "./actions";

interface ServiceOption {
  id: string;
  name: string;
}

export function ServiceLinks({
  professionalId,
  services,
  linkedServiceIds,
}: {
  professionalId: string;
  services: ServiceOption[];
  linkedServiceIds: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const linked = new Set(linkedServiceIds);

  if (services.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-stone-400">
        Cadastre serviços antes de vinculá-los a este profissional.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {services.map((service) => {
          const isLinked = linked.has(service.id);
          return (
            <li key={service.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 text-sm dark:border-white/10">
                <input
                  type="checkbox"
                  checked={isLinked}
                  disabled={isPending}
                  onChange={() =>
                    startTransition(async () => {
                      setError(null);
                      const result = await toggleServiceLinkAction(
                        professionalId,
                        service.id,
                        !isLinked,
                      );
                      if (result?.error) setError(result.error);
                    })
                  }
                  className="size-4 accent-accent-500"
                />
                <span className="text-zinc-800 dark:text-stone-200">{service.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
