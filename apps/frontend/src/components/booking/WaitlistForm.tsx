"use client";

import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function WaitlistForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: { clientName: string; clientPhone: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      setError("Preencha nome e telefone para entrar na lista.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ clientName, clientPhone });
      setDone(true);
    } catch {
      setError("Não foi possível entrar na lista agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 p-6 text-center dark:border-white/15">
        <CheckCircle size={32} weight="fill" className="text-(--tenant-accent)" />
        <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-white">
          Você entrou na lista de espera
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
          O negócio vai te chamar assim que abrir um horário.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 p-5 dark:border-white/10">
      <p className="text-sm font-medium text-zinc-900 dark:text-white">Entrar na lista de espera</p>
      <div className="mt-4 flex flex-col gap-4">
        <Input
          label="Seu nome"
          name="waitlistName"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          accentScoped
        />
        <Input
          label="Seu telefone"
          name="waitlistPhone"
          type="tel"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          accentScoped
        />
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" variant="tenant" disabled={submitting} className="flex-1">
            {submitting ? "Enviando..." : "Entrar na lista"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Voltar
          </Button>
        </div>
      </div>
    </form>
  );
}
