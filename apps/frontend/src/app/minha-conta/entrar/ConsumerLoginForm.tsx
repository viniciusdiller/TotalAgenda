"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConsumerLoginStatus } from "@totalagenda/shared-types";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Button } from "@/components/ui/Button";
import { loginAction, loginStartAction, registerAction, setPasswordAction } from "./actions";

const MIN_PASSWORD = 8;

export function ConsumerLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<ConsumerLoginStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginStartAction(phone);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStatus(result.status);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (status !== "password_required") {
      if (password.length < MIN_PASSWORD) {
        setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
        return;
      }
      if (password !== confirm) {
        setError("As senhas não conferem.");
        return;
      }
      if (!consent) {
        setError("É necessário aceitar os termos e a política de privacidade.");
        return;
      }
    }

    startTransition(async () => {
      const result =
        status === "password_required"
          ? await loginAction(phone, password, next)
          : status === "needs_password_setup"
            ? await setPasswordAction({ phone, email, password, consent }, next)
            : await registerAction({ name, phone, email, password, consent }, next);

      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  if (status === null) {
    return (
      <form onSubmit={handleStart} className="flex flex-col gap-4">
        <MaskedInput
          mask="phone"
          label="Seu telefone"
          name="phone"
          type="tel"
          placeholder="(11) 91234-5678"
          autoComplete="tel"
          value={phone}
          onChange={setPhone}
          required
          accentScoped
        />
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <Button type="submit" variant="tenant" disabled={pending} className="w-full disabled:opacity-60">
          {pending ? "Continuando..." : "Continuar"}
        </Button>
      </form>
    );
  }

  const isLogin = status === "password_required";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-stone-300">
        {isLogin
          ? "Digite sua senha para entrar."
          : status === "needs_password_setup"
            ? "Encontramos seus agendamentos anteriores. Crie uma senha pra proteger sua conta."
            : "Não achamos uma conta com esse telefone. Crie a sua."}{" "}
        <button
          type="button"
          onClick={() => {
            setStatus(null);
            setPassword("");
            setConfirm("");
            setError(null);
          }}
          className="font-semibold text-(--tenant-accent)"
        >
          Trocar telefone ({phone})
        </button>
      </p>

      {status === "register" ? (
        <Input
          label="Seu nome"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          accentScoped
        />
      ) : null}

      {!isLogin ? (
        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="Vamos usar para recuperar sua conta."
          required
          accentScoped
        />
      ) : null}

      <Input
        label={isLogin ? "Senha" : "Crie uma senha"}
        name="password"
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        accentScoped
      />

      {!isLogin ? (
        <>
          <Input
            label="Confirme a senha"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            accentScoped
          />
          <label className="flex items-start gap-2 text-xs text-zinc-500 dark:text-stone-400">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            Aceito os termos de uso e a política de privacidade. Meus dados serão usados só para
            identificar minha conta, meus agendamentos e avaliações.
          </label>
        </>
      ) : null}

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <Button type="submit" variant="tenant" disabled={pending} className="w-full disabled:opacity-60">
        {pending
          ? "Aguarde..."
          : isLogin
            ? "Entrar"
            : status === "register"
              ? "Criar conta"
              : "Salvar senha e entrar"}
      </Button>
    </form>
  );
}
