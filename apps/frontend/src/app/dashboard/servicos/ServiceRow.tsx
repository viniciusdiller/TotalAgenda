"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toggleServiceActiveAction, updateServiceAction } from "./actions";

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ServiceRow({
  id,
  name,
  description,
  durationMinutes,
  priceCents,
  isActive,
  canManage,
}: {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [nameInput, setNameInput] = useState(name);
  const [descriptionInput, setDescriptionInput] = useState(description ?? "");
  const [durationInput, setDurationInput] = useState(String(durationMinutes));
  const [priceInput, setPriceInput] = useState((priceCents / 100).toString());

  function toggleActive() {
    startTransition(async () => {
      setError(null);
      const result = await toggleServiceActiveAction(id, !isActive);
      if (result?.error) setError(result.error);
    });
  }

  function startEditing() {
    setNameInput(name);
    setDescriptionInput(description ?? "");
    setDurationInput(String(durationMinutes));
    setPriceInput((priceCents / 100).toString());
    setError(null);
    setEditing(true);
  }

  function save() {
    const priceReais = Number(priceInput);
    const duration = Number(durationInput);
    if (!nameInput.trim()) {
      setError("Informe o nome do serviço.");
      return;
    }
    if (!Number.isFinite(priceReais) || priceReais < 0) {
      setError("Informe um preço válido.");
      return;
    }
    if (!Number.isFinite(duration) || duration < 5) {
      setError("A duração mínima é de 5 minutos.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await updateServiceAction(id, {
        name: nameInput.trim(),
        description: descriptionInput.trim() || undefined,
        durationMinutes: duration,
        priceCents: Math.round(priceReais * 100),
      });
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-3 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Nome"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            required
          />
          <Input
            label="Duração (minutos)"
            type="number"
            min={5}
            step={5}
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            required
          />
          <Input
            label="Preço (R$)"
            type="number"
            min={0}
            step="0.01"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            required
          />
          <div className="sm:col-span-3">
            <Input
              label="Descrição (opcional)"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="flex gap-3">
          <Button type="button" disabled={isPending} onClick={save} className="disabled:opacity-60">
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" disabled={isPending} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900 dark:text-white">{name}</p>
          <p className="text-sm text-zinc-500 dark:text-stone-400">
            {durationMinutes} min · {formatPrice(priceCents)}
          </p>
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
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={startEditing}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:text-stone-400 dark:hover:text-stone-200"
              >
                Editar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={toggleActive}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:text-stone-400 dark:hover:text-stone-200"
              >
                {isActive ? "Desativar" : "Ativar"}
              </button>
            </>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </li>
  );
}
