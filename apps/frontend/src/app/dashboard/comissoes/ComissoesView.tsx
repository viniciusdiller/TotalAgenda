"use client";

import { useActionState, useState, useTransition } from "react";
import { DateTime } from "luxon";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { riseIn } from "@/lib/stagger";
import type { CommissionReport, CommissionRule } from "@totalagenda/shared-types";
import {
  createCommissionRuleAction,
  fetchCommissionReportAction,
  type CommissionRuleState,
} from "./actions";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const [report, setReport] = useState<CommissionReport | null>(null);
  const [isPending, startTransition] = useTransition();
  const [from, setFrom] = useState(DateTime.now().startOf("month").toISODate()!);
  const [to, setTo] = useState(DateTime.now().endOf("month").toISODate()!);

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

  function loadReport() {
    startTransition(async () => {
      setReport(
        await fetchCommissionReportAction(
          DateTime.fromISO(from).startOf("day").toISO()!,
          DateTime.fromISO(to).endOf("day").toISO()!,
        ),
      );
    });
  }

  return (
    <div className="mt-6 space-y-10">
      <section>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Regras</h2>

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
          <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">
            Nenhuma regra ainda — sem regra, ninguém recebe comissão. Cadastre uma abaixo.
          </p>
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
            <select name="targetId" className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white">
              <option value="">— alvo específico (opcional) —</option>
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

      <section>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Relatório</h2>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          />
          <button
            type="button"
            onClick={loadReport}
            disabled={isPending}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-white/15 dark:text-stone-200"
          >
            {isPending ? "Carregando..." : "Ver"}
          </button>
        </div>

        {report ? (
          <div className="mt-4">
            <p className="text-lg font-bold text-zinc-900 dark:text-white">
              {brl(report.totalCents)}{" "}
              <span className="text-sm font-normal text-zinc-400">no período</span>
            </p>
            <ul className="mt-2 divide-y divide-zinc-100 text-sm dark:divide-white/5">
              {report.byProfessional.map((row, i) => (
                <li
                  key={row.professionalId}
                  style={riseIn(i)}
                  className="animate-rise-in flex justify-between py-2"
                >
                  <span className="text-zinc-700 dark:text-stone-200">
                    {row.name}{" "}
                    <span className="text-zinc-400">({row.count})</span>
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {brl(row.totalCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
