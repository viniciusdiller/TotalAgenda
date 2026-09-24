import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { Logo } from "@/components/brand/Logo";
import { Footer } from "@/components/marketing/Footer";
import { BackLink } from "@/components/ui/BackLink";

export const metadata: Metadata = { title: "Criar conta - TotalAgenda" };

export default function CadastroPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 items-center justify-center bg-stone-50 px-6 py-16 dark:bg-zinc-950">
        <div className="w-full max-w-sm">
          <BackLink href="/" label="Voltar" />
          <Link href="/" className="mt-6 inline-block">
            <Logo />
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold text-zinc-900 dark:text-white">
            Crie a conta do seu negócio
          </h1>
          {/* 14 dias = TRIAL_DAYS no backend (billing/trial.constants.ts). */}
          <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
            Teste o TotalAgenda por 14 dias, sem cartão de crédito.
          </p>

          <div className="mt-8">
            <SignupForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
