"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createProfessionalAction, type CreateProfessionalState } from "./actions";

const initialState: CreateProfessionalState = {};

export function CreateProfessionalForm() {
  const [state, action, pending] = useActionState(createProfessionalAction, initialState);

  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-zinc-200 p-5 sm:grid-cols-3 dark:border-white/10">
      <Input label="Nome" name="name" required />
      <Input label="E-mail" name="email" type="email" required />
      <Input
        label="Senha inicial"
        name="initialPassword"
        type="password"
        minLength={8}
        required
        hint="Compartilhe com o profissional para o primeiro acesso."
      />

      {state?.error ? (
        <p className="sm:col-span-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending} className="disabled:opacity-60">
          {pending ? "Cadastrando..." : "Cadastrar profissional"}
        </Button>
      </div>
    </form>
  );
}
