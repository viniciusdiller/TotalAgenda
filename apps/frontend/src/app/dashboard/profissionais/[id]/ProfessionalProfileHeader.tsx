"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfessionalProfileAction } from "./actions";

export function ProfessionalProfileHeader({
  professionalId,
  name,
  email,
  bio,
  canManage,
}: {
  professionalId: string;
  name: string;
  email: string;
  bio: string | null;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [nameInput, setNameInput] = useState(name);
  const [emailInput, setEmailInput] = useState(email);
  const [bioInput, setBioInput] = useState(bio ?? "");

  function startEditing() {
    setNameInput(name);
    setEmailInput(email);
    setBioInput(bio ?? "");
    setError(null);
    setEditing(true);
  }

  function save() {
    if (!nameInput.trim() || !emailInput.trim()) {
      setError("Informe nome e e-mail.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await updateProfessionalProfileAction(professionalId, {
        name: nameInput.trim(),
        email: emailInput.trim(),
        bio: bioInput.trim() || undefined,
      });
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nome" value={nameInput} onChange={(e) => setNameInput(e.target.value)} required />
          <Input
            label="E-mail"
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-stone-200">Bio (opcional)</span>
          <textarea
            value={bioInput}
            onChange={(e) => setBioInput(e.target.value)}
            rows={3}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          />
        </label>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="flex gap-3">
          <Button type="button" disabled={isPending} onClick={save} className="disabled:opacity-60">
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" disabled={isPending} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">{name}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">{email}</p>
        {bio ? <p className="mt-2 text-sm text-zinc-600 dark:text-stone-300">{bio}</p> : null}
      </div>
      {canManage ? (
        <button
          type="button"
          onClick={startEditing}
          className="shrink-0 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Editar
        </button>
      ) : null}
    </div>
  );
}
