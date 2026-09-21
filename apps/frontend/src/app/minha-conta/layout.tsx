import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/components/brand/palette";

// Área do cliente final (conta global, fora de /[slug]). Reusa componentes que leem
// --tenant-accent (Input accentScoped, Button "tenant") definindo a paleta fixa da marca aqui —
// mesmo critério do layout do salão: identidade TotalAgenda, sem customização por tenant.
export default function MinhaContaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={
        {
          "--tenant-accent": BRAND.primary,
          "--tenant-accent-secondary": BRAND.accentCheck,
        } as React.CSSProperties
      }
      className="flex min-h-dvh flex-col bg-stone-50 dark:bg-zinc-950"
    >
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 pt-6">
        <Link href="/" className="inline-block">
          <Logo markSize={28} />
        </Link>
        <Link
          href="/descobrir"
          className="text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-900 dark:text-stone-300 dark:hover:text-white"
        >
          Descobrir salões
        </Link>
      </header>
      {children}
    </div>
  );
}
