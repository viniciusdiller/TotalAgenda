"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Input label="Nome do negócio" name="businessName" placeholder="Studio da Ana" required />
      <Input label="Seu nome" name="ownerName" placeholder="Ana Silva" required />
      <Input label="E-mail" name="email" type="email" autoComplete="email" required />
      <Input
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="Mínimo de 8 caracteres."
        required
      />

      {state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2 w-full disabled:opacity-60">
        {pending ? "Criando conta..." : "Criar conta grátis"}
      </Button>

      <p className="text-center text-sm text-zinc-500 dark:text-stone-400">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-accent-600 dark:text-accent-300">
          Entrar
        </Link>
      </p>
    </form>
  );
}
