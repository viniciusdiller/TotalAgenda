"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { setPasswordAction, type SetPasswordState } from "./actions";

const initialState: SetPasswordState = {};

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setPasswordAction, initialState);

  if (state?.success) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-stone-300">
          Senha definida com sucesso. Agora você já pode entrar.
        </p>
        <Button href="/entrar" className="w-full">
          Ir para o login
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <Input
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Input
        label="Confirmar nova senha"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />

      {state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2 w-full disabled:opacity-60">
        {pending ? "Salvando..." : "Definir senha"}
      </Button>
    </form>
  );
}
