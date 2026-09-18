import type { Metadata } from "next";
import { ConsumerLoginForm } from "./ConsumerLoginForm";

export const metadata: Metadata = { title: "Entrar - TotalAgenda" };

export default async function ConsumerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-brand text-2xl font-bold text-zinc-900 dark:text-white">
          Entrar na sua conta
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
          Uma conta só pra agendar em qualquer salão e acompanhar seu histórico.
        </p>

        <div className="mt-8">
          <ConsumerLoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
