import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/brand/Logo";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = { title: "Entrar - TotalAgenda" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 items-center justify-center bg-stone-50 px-6 py-16 dark:bg-zinc-950">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <Link href="/" className="mt-6 inline-block">
            <Logo />
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
      <Footer />
    </div>
  );
}
