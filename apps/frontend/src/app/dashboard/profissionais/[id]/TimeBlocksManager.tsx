"use client";

import { useActionState, useTransition } from "react";
import { DateTime } from "luxon";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createTimeBlockAction, deleteTimeBlockAction, type CreateTimeBlockState } from "./actions";

const TIMEZONE = "America/Sao_Paulo";

interface TimeBlock {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

const initialState: CreateTimeBlockState = {};

export function TimeBlocksManager({
  professionalId,
  blocks,
}: {
  professionalId: string;
  blocks: TimeBlock[];
}) {
  const boundAction = createTimeBlockAction.bind(null, professionalId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const [isDeleting, startDelete] = useTransition();

  return (
    <div>
      <form action={action} className="grid gap-4 sm:grid-cols-4">
        <Input label="Data" name="date" type="date" required />
        <Input label="Início" name="startTime" type="time" required />
        <Input label="Fim" name="endTime" type="time" required />
        <Input label="Motivo (opcional)" name="reason" placeholder="Almoço" />

        {state?.error ? (
          <p className="sm:col-span-4 text-sm text-red-600 dark:text-red-400">{state.error}</p>
        ) : null}

        <div className="sm:col-span-4">
          <Button type="submit" disabled={pending} variant="ghost" className="disabled:opacity-60">
            {pending ? "Bloqueando..." : "Bloquear horário"}
          </Button>
        </div>
      </form>

      {blocks.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-stone-400">Nenhum bloqueio cadastrado.</p>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
          {blocks.map((block) => (
            <li key={block.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {DateTime.fromISO(block.startAt)
                    .setZone(TIMEZONE)
                    .setLocale("pt-BR")
                    .toFormat("dd/LL 'das' HH:mm 'às' ")}
                  {DateTime.fromISO(block.endAt).setZone(TIMEZONE).toFormat("HH:mm")}
                </p>
                {block.reason ? (
                  <p className="text-sm text-zinc-500 dark:text-stone-400">{block.reason}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => startDelete(() => deleteTimeBlockAction(professionalId, block.id))}
                className="p-1.5 text-zinc-400 hover:text-red-600 disabled:opacity-50"
                aria-label="Remover bloqueio"
              >
                <Trash size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
