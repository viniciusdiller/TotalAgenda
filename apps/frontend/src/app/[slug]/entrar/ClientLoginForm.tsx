"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Button } from "@/components/ui/Button";
import { clientLoginAction, type ClientLoginState } from "./actions";

const initialState: ClientLoginState = {};

export function ClientLoginForm({ slug }: { slug: string }) {
  const action = clientLoginAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state?.notFound) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-zinc-600 dark:text-stone-300">
          Ainda não encontramos um cadastro com esse telefone. Faça seu primeiro agendamento e
          criaremos sua conta automaticamente.
        </p>
        <Button variant="tenant" href={`/${slug}/agendar`}>
          Agendar horário
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <MaskedInput
        mask="phone"
        label="Seu telefone"
        name="phone"
        type="tel"
        placeholder="(11) 91234-5678"
        autoComplete="tel"
        required
        accentScoped
      />

      {state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <Button type="submit" variant="tenant" disabled={pending} className="mt-2 w-full disabled:opacity-60">
        {pending ? "Entrando..." : "Entrar"}
      </Button>

      <p className="text-center text-sm text-zinc-500 dark:text-stone-400">
        Ainda não tem conta?{" "}
        <Link href={`/${slug}/agendar`} className="font-semibold text-(--tenant-accent)">
          Faça seu primeiro agendamento
        </Link>
      </p>
    </form>
  );
}
