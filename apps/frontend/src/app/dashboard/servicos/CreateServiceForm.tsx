"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createServiceAction, type CreateServiceState } from "./actions";

const initialState: CreateServiceState = {};

export function CreateServiceForm() {
  const [state, action, pending] = useActionState(createServiceAction, initialState);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-2xl border border-zinc-200 p-5 sm:grid-cols-3 dark:border-white/10"
    >
      <Input label="Nome do serviço" name="name" placeholder="Corte Feminino" required />
      <Input label="Duração (minutos)" name="durationMinutes" type="number" min={5} step={5} required />
      <Input label="Preço (R$)" name="price" type="number" min={0} step="0.01" required />
      <div className="sm:col-span-3">
        <Input label="Descrição (opcional)" name="description" />
      </div>

      {state?.error ? (
        <p className="sm:col-span-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending} className="disabled:opacity-60">
          {pending ? "Cadastrando..." : "Cadastrar serviço"}
        </Button>
      </div>
    </form>
  );
}
