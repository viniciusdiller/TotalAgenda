"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
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
      <Input label="Nome do serviço" name="name" placeholder="Corte Feminino" required minLength={2} maxLength={120} hint="Como o cliente vê o serviço na página de agendamento." />
      <Input label="Duração (minutos)" name="durationMinutes" type="number" inputMode="numeric" min={5} max={1440} step={5} required hint="Tempo que o profissional fica ocupado (5 a 1440)." />
      <MaskedInput mask="money" label="Preço (R$)" name="price" placeholder="0,00" required hint="Valor cobrado por este serviço." />
      <div className="sm:col-span-3">
        <Input label="Descrição (opcional)" name="description" maxLength={1000} hint="Aparece na página pública. Ex.: o que está incluso no serviço." />
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
