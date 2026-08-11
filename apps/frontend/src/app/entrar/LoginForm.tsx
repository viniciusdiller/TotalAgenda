"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginAction, type LoginState } from "./actions";

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://totalsoftware.com.br";
const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Input label="E-mail" name="email" type="email" autoComplete="email" required />
      <Input
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      {state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2 w-full disabled:opacity-60">
        {pending ? "Entrando..." : "Entrar"}
      </Button>

      <p className="text-center text-sm text-zinc-500 dark:text-stone-400">
        Ainda não tem conta?{" "}
        <Link href={LANDING_URL} className="font-semibold text-accent-600 dark:text-accent-300">
          Criar conta grátis
        </Link>
      </p>
    </form>
  );
}
