import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

// Link "Voltar" com destino fixo (padrão: tela inicial do site).
export function BackLink({ href = "/", label = "Voltar" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg py-1.5 pr-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:text-stone-300 dark:hover:text-white"
    >
      <ArrowLeft size={16} weight="bold" />
      {label}
    </Link>
  );
}
