"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

// Volta pra página anterior do histórico do navegador; se a pessoa chegou direto (aba nova, link
// externo) não há pra onde voltar, então vai pro `fallbackHref`.
export function BackButton({
  fallbackHref = "/",
  label = "Voltar",
  className,
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg py-1.5 pr-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:text-stone-300 dark:hover:text-white"
      }
    >
      <ArrowLeft size={16} weight="bold" />
      {label}
    </button>
  );
}
