import Link from "next/link";
import type { Metadata } from "next";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = { title: "Definir senha - TotalAgenda" };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function checkToken(token: string): Promise<{ name: string } | null> {
  const response = await fetch(`${API_URL}/auth/set-password/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

export default async function DefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const invite = token ? await checkToken(token) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-6 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg font-bold text-zinc-900 dark:text-white">
          TotalAgenda
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-zinc-900 dark:text-white">
          Definir senha
        </h1>

        {invite && token ? (
          <>
            <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
              Bem-vindo(a), {invite.name}. Escolha uma senha para acessar sua agenda.
            </p>
            <div className="mt-8">
              <SetPasswordForm token={token} />
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
            Este link para definir senha é inválido ou expirou. Se sua assinatura já foi
            confirmada, entre em contato com o suporte para receber um novo link.
          </p>
        )}
      </div>
    </main>
  );
}
