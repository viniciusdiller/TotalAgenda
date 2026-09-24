"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const PLAN_PATH = "/dashboard/plano";

// Com o acesso bloqueado por cobrança (teste vencido, cancelada, não paga), o backend responde 403 a
// quase tudo e as páginas do dashboard engolem o erro e mostram uma tela vazia. Em vez disso, o dono
// vai direto para a tela de plano, onde consegue resolver. O backend continua sendo quem barra: isto é
// só para o usuário não ficar olhando páginas vazias.
export function BillingGate({ blocked, children }: { blocked: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const onPlanPage = pathname.startsWith(PLAN_PATH);
  const mustRedirect = blocked && !onPlanPage;

  useEffect(() => {
    if (mustRedirect) router.replace(PLAN_PATH);
  }, [mustRedirect, router]);

  if (mustRedirect) {
    return (
      <p role="status" className="text-sm text-zinc-500 dark:text-stone-400">
        Levando você para a tela de plano...
      </p>
    );
  }
  return <>{children}</>;
}
