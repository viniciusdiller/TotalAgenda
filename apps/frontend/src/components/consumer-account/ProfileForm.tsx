"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { changePasswordAction, updateProfileAction, type FormState } from "@/app/minha-conta/actions";
import { formatPhoneBR } from "@/lib/masks";

const initial: FormState = {};

function Feedback({ state }: { state: FormState | undefined }) {
  if (state?.error) return <p role="alert" className="animate-rise-in text-sm text-red-600 dark:text-red-400">{state.error}</p>;
  if (state?.success) return <p role="status" className="animate-rise-in text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p>;
  return null;
}

export function ProfileForm({
  name,
  email,
  phone,
}: {
  name: string;
  email: string | null;
  phone: string;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-white/10">
      <p className="font-brand font-semibold text-zinc-900 dark:text-white">Dados pessoais</p>
      <Input label="Nome" name="name" autoComplete="name" defaultValue={name} required minLength={2} maxLength={120} accentScoped />
      <Input label="E-mail" name="email" type="email" autoComplete="email" defaultValue={email ?? ""} required maxLength={254} accentScoped />
      <Input
        label="Telefone"
        name="phone"
        defaultValue={formatPhoneBR(phone)}
        disabled
        hint="O telefone identifica sua conta em todos os salões e não pode ser alterado aqui."
        accentScoped
      />
      <Feedback state={state} />
      <Button type="submit" variant="tenant" disabled={pending} className="self-start disabled:opacity-60">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);

  return (
    <form
      action={action}
      key={state?.success ? "done" : "form"}
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-white/10"
    >
      <p className="font-brand font-semibold text-zinc-900 dark:text-white">Alterar senha</p>
      <Input
        label="Senha atual"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        maxLength={72}
        accentScoped
      />
      <Input
        label="Nova senha"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        accentScoped
      />
      <Input
        label="Confirme a nova senha"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        accentScoped
      />
      <Feedback state={state} />
      <Button type="submit" variant="tenant" disabled={pending} className="self-start disabled:opacity-60">
        {pending ? "Salvando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
