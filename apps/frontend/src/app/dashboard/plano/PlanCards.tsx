"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import {
  type BillingStatusResponse,
  type PlanInfo,
  type PlanTier,
  formatBRL,
  planCardAction,
} from "@/lib/billing";
import { ChangePlanDialog } from "./ChangePlanDialog";
import { startCheckoutAction } from "./actions";

function limitText(plan: PlanInfo): string {
  return plan.maxProfessionals === null ? "Profissionais ilimitados" : `Até ${plan.maxProfessionals} profissionais`;
}

export function PlanCards({
  plans,
  billing,
  isOwner,
  suggestedTier = null,
}: {
  plans: PlanInfo[];
  billing: BillingStatusResponse;
  isOwner: boolean;
  suggestedTier?: PlanTier | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [changeTier, setChangeTier] = useState<PlanTier | null>(null);
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);
  const [isPending, startTransition] = useTransition();

  function subscribe(tier: PlanTier) {
    setError(null);
    setPendingTier(tier);
    startTransition(async () => {
      const result = await startCheckoutAction(tier);
      if ("error" in result) {
        setError(result.error);
        setPendingTier(null);
        return;
      }
      // O pagamento acontece na página do Stripe; ele devolve o dono para /dashboard/plano.
      window.location.assign(result.url);
    });
  }

  const changePlan = plans.find((plan) => plan.tier === changeTier);

  return (
    <div>
      <ul className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const action = planCardAction(billing, plan.tier);
          const isSuggested = plan.tier === suggestedTier && action !== "CURRENT";
          return (
            <li
              key={plan.tier}
              className={clsx(
                "flex flex-col rounded-2xl border p-5",
                action === "CURRENT"
                  ? "border-accent-500 bg-accent-50/50 dark:border-accent-400 dark:bg-accent-500/10"
                  : isSuggested
                    ? "border-accent-300 bg-white ring-2 ring-accent-500/30 dark:border-accent-400/60 dark:bg-zinc-900"
                    : "border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900",
              )}
            >
              {isSuggested ? (
                <span className="mb-3 inline-block w-fit rounded-full bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-200">
                  Sua escolha no cadastro
                </span>
              ) : null}
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {formatBRL(plan.priceCents)}
                <span className="text-sm font-medium text-zinc-500 dark:text-stone-400"> /mês</span>
              </p>
              <p className="mt-3 text-sm text-zinc-600 dark:text-stone-300">{limitText(plan)}</p>

              <div className="mt-5 flex-1 content-end">
                {action === "CURRENT" ? (
                  <span className="inline-block rounded-full bg-accent-100 px-3 py-1.5 text-sm font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-200">
                    Seu plano
                  </span>
                ) : action === "MANAGE_PAYMENT" ? (
                  <p className="text-sm text-zinc-500 dark:text-stone-400">
                    Regularize o pagamento antes de trocar de plano.
                  </p>
                ) : !isOwner ? null : action === "CHANGE" ? (
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setChangeTier(plan.tier)}>
                    Trocar para este plano
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => subscribe(plan.tier)}
                  >
                    {isPending && pendingTier === plan.tier ? "Abrindo pagamento..." : `Assinar ${plan.name}`}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {changePlan ? (
        <ChangePlanDialog tier={changePlan.tier} planName={changePlan.name} onClose={() => setChangeTier(null)} />
      ) : null}
    </div>
  );
}
