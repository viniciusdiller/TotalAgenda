import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Criar conta - TotalAgenda" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-6 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg font-bold text-zinc-900 dark:text-white">
          TotalAgenda
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-zinc-900 dark:text-white">
          Criar sua conta
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
          14 dias grátis, sem cartão de crédito.
        </p>

        <div className="mt-8">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
