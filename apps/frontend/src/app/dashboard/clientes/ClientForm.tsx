"use client";

import { useActionState } from "react";
import type { AdminClientDetail } from "@totalagenda/shared-types";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { type ClientFormState } from "./actions";

const initial: ClientFormState = {};

export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: (prev: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  client?: AdminClientDetail;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome" name="name" defaultValue={client?.name ?? ""} required />
        <MaskedInput
          mask="phone"
          label="Telefone"
          name="phone"
          type="tel"
          defaultValue={client?.phone ?? ""}
          required
        />
        <Input label="E-mail" name="email" type="email" defaultValue={client?.email ?? ""} />
        <Input
          label="Nascimento"
          name="birthDate"
          type="date"
          defaultValue={client?.birthDate?.slice(0, 10) ?? ""}
        />
        <MaskedInput mask="cpf" label="CPF" name="cpf" defaultValue={client?.cpf ?? ""} />
        <Input
          label="Tags (separadas por vírgula)"
          name="tags"
          defaultValue={client?.tags.join(", ") ?? ""}
        />
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-stone-200">
        Observações
        <textarea
          name="notes"
          defaultValue={client?.notes ?? ""}
          rows={3}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-[15px] text-zinc-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none dark:border-white/15 dark:bg-zinc-900 dark:text-white"
        />
      </label>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
      >
        {pending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
