"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { openPortalAction } from "./actions";

// Portal do Stripe: forma de pagamento, faturas e cancelamento. A troca de plano NÃO é feita lá
// (fica desligada no portal): é pela tela de planos, que valida limite de profissionais.
export function PortalButton({ label = "Gerenciar pagamento" }: { label?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open() {
    setError(null);
    startTransition(async () => {
      const result = await openPortalAction();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <div>
      <Button type="button" variant="ghost" onClick={open} disabled={isPending} className="disabled:opacity-60">
        {isPending ? "Abrindo..." : label}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
