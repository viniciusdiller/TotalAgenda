import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar - TotalAgenda" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-6 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg font-bold text-zinc-900 dark:text-white">
          TotalAgenda
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-zinc-900 dark:text-white">
          Entrar
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
          Acesse a agenda do seu negócio.
        </p>

        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
