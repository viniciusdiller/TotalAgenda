"use client";

import { useState, useTransition } from "react";
import { DateTime } from "luxon";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatCentsBRL, moneyToCents } from "@/lib/masks";
import type { AdminProduct, PaymentMethod, Ticket } from "@totalagenda/shared-types";
import {
  addItemAction,
  addPaymentAction,
  cancelTicketAction,
  closeTicketAction,
  removeItemAction,
  setDiscountAction,
} from "../actions";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Texto BRL → centavos; valor mal formado dá null (nunca um 0 silencioso que zeraria desconto/pagamento).
const centsFromReais = (v: string) => moneyToCents(v);

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Dinheiro" },
  { value: "DEBIT", label: "Débito" },
  { value: "CREDIT", label: "Crédito" },
  { value: "PIX", label: "Pix" },
  { value: "OTHER", label: "Outro" },
];

interface CatalogService {
  id: string;
  name: string;
  priceCents: number;
}

export function TicketPdv({
  initialTicket,
  services,
  products,
  team,
}: {
  initialTicket: Ticket;
  services: CatalogService[];
  products: AdminProduct[];
  team: { id: string; name: string }[];
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [pickKind, setPickKind] = useState<"SERVICE" | "PRODUCT" | "CUSTOM">("SERVICE");
  const [pickId, setPickId] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [professionalId, setProfessionalId] = useState("");

  const [discountInput, setDiscountInput] = useState(
    initialTicket.discountCents ? formatCentsBRL(initialTicket.discountCents) : "",
  );
  const [payMethod, setPayMethod] = useState<PaymentMethod>("PIX");
  const [payAmount, setPayAmount] = useState("");
  const [removingItem, setRemovingItem] = useState<{ id: string; description: string } | null>(
    null,
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const readOnly = ticket.status !== "OPEN";

  function run(fn: () => Promise<{ ok: boolean; error?: string; ticket?: Ticket }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok && result.ticket) setTicket(result.ticket);
      else if (!result.ok) setError(result.error ?? "Erro.");
    });
  }

  function addItem() {
    const body: Record<string, unknown> = {
      kind: pickKind,
      professionalId: professionalId || undefined,
    };
    if (pickKind === "SERVICE") body.serviceId = pickId;
    else if (pickKind === "PRODUCT") body.productId = pickId;
    else {
      const unitPriceCents = centsFromReais(customPrice);
      if (unitPriceCents === null) {
        setError("Informe um valor válido para o item (ex: 25,00).");
        return;
      }
      body.description = customDesc.trim();
      body.unitPriceCents = unitPriceCents;
    }
    run(() => addItemAction(ticket.id, body));
    setPickId("");
    setCustomDesc("");
    setCustomPrice("");
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
          Comanda · {ticket.client?.name ?? "avulsa"}
        </h1>
        <span className="text-sm text-zinc-400">
          {ticket.status === "OPEN"
            ? `aberta ${DateTime.fromISO(ticket.openedAt).setLocale("pt-BR").toRelative()}`
            : ticket.status === "CLOSED"
              ? "fechada"
              : "cancelada"}
        </span>
      </div>

      {/* Itens */}
      <div className="mt-5 rounded-2xl border border-zinc-200 dark:border-white/10">
        {ticket.items.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500 dark:text-stone-400">Nenhum item.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-white/5">
            {ticket.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {item.quantity > 1 ? `${item.quantity}× ` : ""}
                    {item.description}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {item.professional?.name ?? "sem profissional"} · {brl(item.unitPriceCents)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-700 dark:text-stone-200">
                    {brl(item.totalCents)}
                  </span>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() =>
                        setRemovingItem({ id: item.id, description: item.description })
                      }
                      className="text-zinc-300 hover:text-red-500"
                      aria-label="Remover item"
                    >
                      <Trash size={16} />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Adicionar item */}
      {!readOnly ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl border border-zinc-200 p-3 dark:border-white/10">
          <select
            value={pickKind}
            onChange={(e) => {
              setPickKind(e.target.value as typeof pickKind);
              setPickId("");
            }}
            className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          >
            <option value="SERVICE">Serviço</option>
            <option value="PRODUCT">Produto</option>
            <option value="CUSTOM">Avulso</option>
          </select>

          {pickKind === "SERVICE" ? (
            <select
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              className="min-w-40 flex-1 rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            >
              <option value="">Escolher serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {brl(s.priceCents)}
                </option>
              ))}
            </select>
          ) : pickKind === "PRODUCT" ? (
            <select
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              className="min-w-40 flex-1 rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            >
              <option value="">Escolher produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {brl(p.priceCents)} (estoque {p.stock})
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Descrição"
                maxLength={120}
                className="min-w-32 flex-1 rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
              />
              <MoneyInput
                value={customPrice}
                onChange={setCustomPrice}
                placeholder="R$ 0,00"
                aria-label="Valor do item (R$)"
                className="w-20 rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
              />
            </>
          )}

          <select
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          >
            <option value="">Sem profissional</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={
              isPending ||
              (pickKind !== "CUSTOM" && !pickId) ||
              (pickKind === "CUSTOM" && (customDesc.trim().length < 2 || !customPrice))
            }
            onClick={addItem}
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      ) : null}

      {/* Totais + desconto */}
      <div className="mt-5 space-y-1 text-sm">
        <div className="flex justify-between text-zinc-500 dark:text-stone-400">
          <span>Subtotal</span>
          <span>{brl(ticket.subtotalCents)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 dark:text-stone-400">Desconto</span>
          {readOnly ? (
            <span>− {brl(ticket.discountCents)}</span>
          ) : (
            <span className="flex items-center gap-2">
              <MoneyInput
                value={discountInput}
                onChange={setDiscountInput}
                onBlur={() => {
                  // Vazio = sem desconto; valor mal formado NÃO vira desconto zero em silêncio.
                  const discountCents = discountInput ? centsFromReais(discountInput) : 0;
                  if (discountCents === null) {
                    setError("Informe um desconto válido (ex: 5,00).");
                    return;
                  }
                  if (discountCents !== ticket.discountCents) run(() => setDiscountAction(ticket.id, discountCents));
                }}
                placeholder="0,00"
                aria-label="Desconto (R$)"
                className="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-right text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
              />
            </span>
          )}
        </div>
        <div className="flex justify-between border-t border-zinc-200 pt-1 font-semibold text-zinc-900 dark:border-white/10 dark:text-white">
          <span>Total</span>
          <span>{brl(ticket.totalCents)}</span>
        </div>
        <div className="flex justify-between text-zinc-500 dark:text-stone-400">
          <span>Pago</span>
          <span>{brl(ticket.paidCents)}</span>
        </div>
        {ticket.dueCents > 0 ? (
          <div className="flex justify-between font-medium text-amber-600 dark:text-amber-400">
            <span>Falta</span>
            <span>{brl(ticket.dueCents)}</span>
          </div>
        ) : null}
      </div>

      {/* Pagamentos */}
      {ticket.payments.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-zinc-500 dark:text-stone-400">
          {ticket.payments.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{METHODS.find((m) => m.value === p.method)?.label ?? p.method}</span>
              <span>{brl(p.amountCents)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!readOnly ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <select
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
            className="rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <MoneyInput
            value={payAmount}
            onChange={setPayAmount}
            placeholder={brl(ticket.dueCents)}
            aria-label="Valor do pagamento (R$)"
            className="w-28 rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              const cents = payAmount ? centsFromReais(payAmount) : ticket.dueCents;
              if (cents === null || cents < 1) {
                setError("Informe um valor de pagamento válido (ex: 50,00).");
                return;
              }
              run(() => addPaymentAction(ticket.id, { method: payMethod, amountCents: cents }));
              setPayAmount("");
            }}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-white/15 dark:text-stone-200"
          >
            Registrar pagamento
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {!readOnly ? (
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={isPending || ticket.dueCents > 0 || ticket.items.length === 0}
            onClick={() => run(() => closeTicketAction(ticket.id))}
            className="rounded-full bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-40"
          >
            Fechar comanda
          </button>
          <button
            type="button"
            disabled={isPending || ticket.payments.length > 0}
            onClick={() => setConfirmingCancel(true)}
            className="rounded-full border border-red-200 px-6 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-500/20 dark:text-red-400"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={removingItem !== null}
        onOpenChange={(open) => !open && setRemovingItem(null)}
        title="Remover este item?"
        description={
          removingItem ? `"${removingItem.description}" sai da comanda. Não tem como desfazer.` : undefined
        }
        confirmLabel="Remover item"
        cancelLabel="Voltar"
        tone="danger"
        onConfirm={() => {
          if (!removingItem) return;
          const id = removingItem.id;
          setRemovingItem(null);
          run(() => removeItemAction(ticket.id, id));
        }}
      />

      <ConfirmDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title="Cancelar esta comanda?"
        description="Todos os itens são descartados e a comanda vira 'cancelada'. Não tem como desfazer."
        confirmLabel="Cancelar comanda"
        cancelLabel="Voltar"
        tone="danger"
        onConfirm={() => {
          setConfirmingCancel(false);
          run(() => cancelTicketAction(ticket.id));
        }}
      />
    </div>
  );
}
