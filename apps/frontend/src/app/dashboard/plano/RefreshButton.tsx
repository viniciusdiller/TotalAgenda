"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Depois do pagamento, a confirmação chega ao backend por webhook e pode levar alguns segundos.
export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-60"
    >
      {isPending ? "Atualizando..." : "Atualizar"}
    </button>
  );
}
