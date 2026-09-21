import type { Metadata } from "next";
import { BackLink } from "@/components/ui/BackLink";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Página não encontrada - TotalAgenda" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="animate-rise-in w-full max-w-sm">
        <Logo />
        <p className="mt-8 font-display text-5xl font-bold text-zinc-900 dark:text-white">404</p>
        <h1 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">
          Não encontramos essa página
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
          O endereço pode ter mudado ou o salão não está mais disponível.
        </p>
        <div className="mt-6">
          <BackLink href="/" label="Voltar ao início" />
        </div>
      </div>
    </main>
  );
}
