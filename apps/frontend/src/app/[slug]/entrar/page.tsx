import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getTenant } from "../layout";
import { ClientLoginForm } from "./ClientLoginForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant(slug);
  return { title: tenant ? `Entrar em ${tenant.name} - TotalAgenda` : "Negócio não encontrado" };
}

export default async function ClientLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // O layout já chama notFound() se o tenant não existisse, mas isso não impede este
  // componente de renderizar no mesmo passe — precisa da própria checagem.
  const tenant = await getTenant(slug);
  if (!tenant) {
    notFound();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-6 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <Link
          href={`/${tenant.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200"
        >
          <ArrowLeft size={16} />
          {tenant.name}
        </Link>

        <h1 className="mt-6 font-display text-2xl font-bold text-zinc-900 dark:text-white">
          Entrar
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
          Acesse seus agendamentos com o seu telefone.
        </p>

        <div className="mt-8">
          <ClientLoginForm slug={slug} />
        </div>
      </div>
    </main>
  );
}
