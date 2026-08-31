"use client";

import { useActionState, useState, useTransition } from "react";
import { DateTime } from "luxon";
import type {
  CashFlowReport,
  DreReport,
  FinanceOverview,
  FinancialCategory,
  FinancialEntry,
  StaffRole,
} from "@totalagenda/shared-types";
import {
  cancelEntryAction,
  closeCommissionsAction,
  createEntryAction,
  fetchCashFlowAction,
  fetchDreAction,
  settleEntryAction,
  type FinanceActionState,
} from "./actions";

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TABS = ["Lançamentos", "A pagar", "A receber", "Fluxo de caixa", "DRE"] as const;
type Tab = (typeof TABS)[number];

const initial: FinanceActionState = {};

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
      {hint ? <p className="text-xs text-amber-600 dark:text-amber-400">{hint}</p> : null}
    </div>
  );
}

export function FinanceView({
  overview,
  entries,
  categories,
  role,
}: {
  overview: FinanceOverview;
  entries: FinancialEntry[];
  categories: FinancialCategory[];
  role: StaffRole;
}) {
  const [tab, setTab] = useState<Tab>("Lançamentos");
  const [state, formAction, pending] = useActionState(createEntryAction, initial);
  const [direction, setDirection] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [, startTransition] = useTransition();

  const [cf, setCf] = useState<CashFlowReport | null>(null);
  const [dre, setDre] = useState<DreReport | null>(null);
  const [reportPending, startReport] = useTransition();
  const [from, setFrom] = useState(DateTime.now().startOf("month").toISODate()!);
  const [to, setTo] = useState(DateTime.now().endOf("month").toISODate()!);

  const isOwner = role === "OWNER";
  const payables = entries.filter((e) => e.direction === "EXPENSE" && e.status === "PENDING");
  const receivables = entries.filter((e) => e.direction === "INCOME" && e.status === "PENDING");

  function loadReports() {
    const f = DateTime.fromISO(from).startOf("day").toISO()!;
    const t = DateTime.fromISO(to).endOf("day").toISO()!;
    startReport(async () => {
      setCf(await fetchCashFlowAction(f, t));
      if (isOwner) setDre(await fetchDreAction(f, t));
    });
  }

  function EntryList({ items }: { items: FinancialEntry[] }) {
    if (items.length === 0)
      return <p className="mt-4 text-sm text-zinc-500 dark:text-stone-400">Nada por aqui.</p>;
    return (
      <ul className="mt-4 divide-y divide-zinc-100 text-sm dark:divide-white/5">
        {items.map((e) => {
          const overdue = e.status === "PENDING" && DateTime.fromISO(e.dueDate) < DateTime.now();
          return (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">{e.description}</p>
                <p className="text-xs text-zinc-400">
                  {e.category?.name ?? "Sem categoria"}
                  {e.counterparty ? ` · ${e.counterparty}` : ""} · vence{" "}
                  {DateTime.fromISO(e.dueDate).toFormat("dd/LL/yyyy")}
                  {e.source !== "MANUAL" ? " · auto" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    e.direction === "INCOME"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-700 dark:text-stone-200"
                  }
                >
                  {e.direction === "INCOME" ? "+" : "−"}
                  {brl(e.amountCents)}
                </span>
                {e.status === "PAID" ? (
                  <span className="text-xs text-zinc-400">quitado</span>
                ) : e.status === "CANCELED" ? (
                  <span className="text-xs text-zinc-400">cancelado</span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startTransition(() => void settleEntryAction(e.id))}
                      className={
                        overdue
                          ? "rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-white"
                          : "rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium dark:border-white/15 dark:text-stone-200"
                      }
                    >
                      Dar baixa
                    </button>
                    {e.source === "MANUAL" ? (
                      <button
                        type="button"
                        onClick={() => startTransition(() => void cancelEntryAction(e.id))}
                        className="text-xs text-zinc-400 hover:text-red-500"
                      >
                        cancelar
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card
          label="A receber"
          value={brl(overview.receivableCents)}
          hint={overview.receivableOverdueCents ? `${brl(overview.receivableOverdueCents)} vencido` : undefined}
        />
        <Card
          label="A pagar"
          value={brl(overview.payableCents)}
          hint={overview.payableOverdueCents ? `${brl(overview.payableOverdueCents)} vencido` : undefined}
        />
        <Card label="Entrou no mês" value={brl(overview.monthIncomeCents)} />
        <Card label="Resultado do mês" value={brl(overview.monthNetCents)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-zinc-200 dark:border-white/10">
        {TABS.filter((t) => t !== "DRE" || isOwner).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              if ((t === "Fluxo de caixa" || t === "DRE") && !cf) loadReports();
            }}
            className={
              tab === t
                ? "border-b-2 border-accent-500 px-3 py-2 text-sm font-medium text-accent-700 dark:text-accent-300"
                : "px-3 py-2 text-sm font-medium text-zinc-500 dark:text-stone-400"
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Lançamentos" ? (
        <>
          <form action={formAction} className="mt-5 grid gap-2 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-2 dark:border-white/10">
            <select
              name="direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value as "INCOME" | "EXPENSE")}
              className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
            <select name="categoryId" className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white">
              <option value="">Sem categoria</option>
              {categories
                .filter((c) => c.direction === direction && !c.isArchived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <input name="description" placeholder="Descrição" required className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white" />
            <input name="counterparty" placeholder="Fornecedor / cliente (opcional)" className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white" />
            <input name="amount" placeholder="Valor (R$)" inputMode="decimal" required className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white" />
            <input name="dueDate" type="date" required defaultValue={DateTime.now().toISODate()!} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white" />
            <label className="flex items-center gap-2 text-sm text-zinc-600 sm:col-span-2 dark:text-stone-300">
              <input type="checkbox" name="paidNow" /> Já quitado
            </label>
            {state.error ? (
              <p className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">{state.error}</p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="w-fit rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50 sm:col-span-2"
            >
              {pending ? "Salvando..." : "Lançar"}
            </button>
          </form>
          <EntryList items={entries} />
        </>
      ) : null}

      {tab === "A pagar" ? (
        <div>
          {isOwner ? <CloseCommissions from={from} to={to} /> : null}
          <EntryList items={payables} />
        </div>
      ) : null}
      {tab === "A receber" ? <EntryList items={receivables} /> : null}

      {tab === "Fluxo de caixa" || tab === "DRE" ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-end gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white" />
            <button type="button" onClick={loadReports} disabled={reportPending} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-white/15 dark:text-stone-200">
              {reportPending ? "..." : "Atualizar"}
            </button>
          </div>

          {tab === "Fluxo de caixa" && cf ? (
            <div className="mt-4 text-sm">
              <div className="flex justify-between border-b border-zinc-200 py-2 font-semibold dark:border-white/10">
                <span>Resultado (realizado)</span>
                <span className={cf.netCents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                  {brl(cf.netCents)}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-zinc-100 dark:divide-white/5">
                {cf.byCategory.map((c) => (
                  <li key={`${c.direction}${c.name}`} className="flex justify-between py-1.5">
                    <span className="text-zinc-600 dark:text-stone-300">{c.name}</span>
                    <span className={c.direction === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-600 dark:text-stone-300"}>
                      {c.direction === "INCOME" ? "+" : "−"}
                      {brl(c.totalCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {tab === "DRE" && dre ? (
            <dl className="mt-4 space-y-1 text-sm">
              <Row label="Receita bruta" value={brl(dre.revenueCents)} />
              <Row label="(−) Custo de produtos (CMV)" value={brl(dre.cogsCents)} />
              <Row label="= Lucro bruto" value={brl(dre.grossProfitCents)} bold />
              {dre.expensesByCategory.map((e) => (
                <Row key={e.name} label={`(−) ${e.name}`} value={brl(e.totalCents)} />
              ))}
              <Row label="= Resultado" value={brl(dre.resultCents)} bold />
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={
        bold
          ? "flex justify-between border-t border-zinc-200 pt-1 font-semibold text-zinc-900 dark:border-white/10 dark:text-white"
          : "flex justify-between text-zinc-600 dark:text-stone-300"
      }
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function CloseCommissions({ from, to }: { from: string; to: string }) {
  const [isPending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mb-4 rounded-xl border border-zinc-200 p-3 text-sm dark:border-white/10">
      <p className="text-zinc-600 dark:text-stone-300">
        Gerar contas a pagar das comissões de {DateTime.fromISO(from).toFormat("dd/LL")} a{" "}
        {DateTime.fromISO(to).toFormat("dd/LL")}.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          start(async () => {
            const r = await closeCommissionsAction(
              DateTime.fromISO(from).startOf("day").toISO()!,
              DateTime.fromISO(to).endOf("day").toISO()!,
              DateTime.now().plus({ days: 5 }).toISODate()!,
            );
            setMsg(r.error ?? "Lançamentos gerados.");
          })
        }
        className="mt-2 rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium dark:border-white/15 dark:text-stone-200"
      >
        Fechar comissões do período
      </button>
      {msg ? <p className="mt-2 text-xs text-zinc-500 dark:text-stone-400">{msg}</p> : null}
    </div>
  );
}
