"use client";

import { useActionState, useState } from "react";
import { Percent } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { riseIn } from "@/lib/stagger";
import { brl } from "@/lib/money";
import type { CommissionRule } from "@totalagenda/shared-types";
import { createCommissionRuleAction, type CommissionRuleState } from "./actions";

interface Option {
  id: string;
  name: string;
}

const initial: CommissionRuleState = {};

export function ComissoesView({
  rules,
  professionals,
  services,
  products,
}: {
  rules: CommissionRule[];
  professionals: Option[];
  services: Option[];
  products: Option[];
}) {
  const [state, formAction, pending] = useActionState(createCommissionRuleAction, initial);
  const [base, setBase] = useState<"SERVICE" | "PRODUCT" | "ALL">("ALL");
  const [kind, setKind] = useState<"PERCENT" | "FIXED">("PERCENT");

  const proName = (id: string) => professionals.find((p) => p.id === id)?.name ?? id;
  const targetName = (rule: CommissionRule) => {
    if (!rule.targetId) return "tudo";
    return (
      services.find((s) => s.id === rule.targetId)?.name ??
      products.find((p) => p.id === rule.targetId)?.name ??
      rule.targetId
    );
  };
  // Frase em português corrido em vez de "profissional · base (alvo)" — a lista crua não
  // dizia em linguagem simples o que a regra realmente faz, nem qual delas vale quando
  // duas se aplicam ao mesmo item (a mais específica vence — ver aviso abaixo da lista).
  const ruleSentence = (rule: CommissionRule) => {
    const amount = rule.kind === "PERCENT" ? `${rule.value}%` : brl(rule.value);
    const pro = proName(rule.professionalId);
    if (rule.base === "ALL") return `${amount} sobre qualquer venda de ${pro}.`;
    const what = rule.targetId
      ? targetName(rule)
      : rule.base === "SERVICE"
        ? "qualquer serviço"
        : "qualquer produto";
    return `${amount} sobre cada venda de ${what} por ${pro}.`;
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Regras de comissão</h2>

        {rules.length > 0 ? (
          <>
            <ul className="mt-3 divide-y divide-zinc-100 text-sm dark:divide-white/5">
              {rules.map((rule, i) => (
                <li
                  key={rule.id}
                  style={riseIn(i)}
                  className="animate-rise-in py-2 text-zinc-700 dark:text-stone-200"
                >
                  {ruleSentence(rule)}
                  {rule.isActive ? "" : " · inativa"}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-zinc-400 dark:text-stone-500">
              Se mais de uma regra vale pra mesma venda, ganha a mais específica: um alvo
              exato (ex.: "Corte masculino") vale mais que "qualquer serviço", que vale mais
              que "qualquer venda". As regras não se somam — só uma é aplicada por item.
            </p>
          </>
        ) : (
          <div className="mt-3">
            <EmptyState
              icon={Percent}
              title="Nenhuma regra ainda"
              description="Sem regra, ninguém recebe comissão. Cadastre uma abaixo."
            />
          </div>
        )}

        <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
          <select name="professionalId" className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white">
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            name="base"
            value={base}
            onChange={(e) => setBase(e.target.value as typeof base)}
            className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          >
            <option value="ALL">Tudo</option>
            <option value="SERVICE">Serviço</option>
            <option value="PRODUCT">Produto</option>
          </select>
          {base !== "ALL" ? (
            <select name="targetId" required className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white">
              <option value="">— escolha o {base === "SERVICE" ? "serviço" : "produto"} —</option>
              {(base === "SERVICE" ? services : products).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : null}
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white">
            <option value="PERCENT">%</option>
            <option value="FIXED">R$ fixo</option>
          </select>
          {kind === "PERCENT" ? (
            <input
              key="percent"
              name="value"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              required
              placeholder="% (0–100)"
              aria-label="Percentual da comissão"
              className="w-24 rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            />
          ) : (
            <MoneyInput
              key="fixed"
              name="value"
              required
              placeholder="R$ 0,00"
              aria-label="Valor fixo da comissão (R$)"
              className="w-28 rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            />
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {pending ? "Adicionando..." : "Adicionar"}
          </button>
        </form>
        {state.error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
        ) : null}
      </section>
    </div>
  );
}
