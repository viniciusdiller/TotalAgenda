"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "@phosphor-icons/react/dist/ssr";
import { ClientPicker } from "./ClientPicker";
import { openTicketAction, type ClientOption } from "./actions";

// "Nova comanda": já pergunta de quem é. Escolher o cliente é opcional (dá pra abrir sem e vincular depois,
// dentro da comanda), mas vincular na abertura garante que o atendimento entra no histórico dele.
export function OpenTicketButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [client, setClient] = useState<ClientOption | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open() {
    setClient(null);
    setError(null);
    dialogRef.current?.showModal();
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await openTicketAction(client ? { clientId: client.id } : {});
      if (result && !result.ok) setError(result.error ?? "Erro.");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
      >
        <Plus size={16} weight="bold" />
        Nova comanda
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Nova comanda"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-left text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
      >
        <h2 className="font-display text-lg font-bold">Nova comanda</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
          Para quem é? O cliente é opcional, e dá para vincular depois dentro da comanda.
        </p>

        <div className="mt-4">
          {client ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-accent-500/40 bg-accent-50/60 px-3 py-2 text-sm dark:bg-accent-500/10">
              <span className="font-medium">{client.name}</span>
              <button
                type="button"
                onClick={() => setClient(null)}
                aria-label="Trocar cliente"
                className="text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <ClientPicker onSelect={setClient} autoFocus />
          )}
        </div>

        {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-white/15 dark:text-stone-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={confirm}
            className="rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {isPending ? "Abrindo..." : client ? "Abrir comanda" : "Abrir sem cliente"}
          </button>
        </div>
      </dialog>
    </>
  );
}
