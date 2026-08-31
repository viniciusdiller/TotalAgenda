"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import type { AdminProduct } from "@totalagenda/shared-types";
import { Input } from "@/components/ui/Input";
import {
  adjustStockAction,
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "./actions";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const initial: ProductActionState = {};

function StockControl({ product }: { product: AdminProduct }) {
  const [qty, setQty] = useState(1);
  const [isPending, startTransition] = useTransition();

  function move(kind: "IN" | "OUT") {
    startTransition(() => {
      void adjustStockAction(product.id, kind, qty);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
        className="w-14 rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={() => move("IN")}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium dark:border-white/15 dark:text-stone-200"
      >
        + entrada
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => move("OUT")}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium dark:border-white/15 dark:text-stone-200"
      >
        − saída
      </button>
    </div>
  );
}

export function ProductsManager({ products }: { products: AdminProduct[] }) {
  const [state, formAction, pending] = useActionState(createProductAction, initial);
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="mt-6">
      {showForm ? (
        <form
          action={formAction}
          className="mb-6 grid gap-3 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-2 dark:border-white/10"
        >
          <Input label="Nome" name="name" required />
          <Input label="SKU (opcional)" name="sku" />
          <Input label="Preço de venda (R$)" name="price" inputMode="decimal" required />
          <Input label="Custo (R$, opcional)" name="cost" inputMode="decimal" />
          <Input label="Estoque inicial" name="initialStock" type="number" />
          {state.error ? (
            <p className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">{state.error}</p>
          ) : null}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Cadastrar"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-zinc-300 px-5 py-2 text-sm dark:border-white/15 dark:text-stone-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          <Plus size={16} weight="bold" />
          Novo produto
        </button>
      )}

      {products.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-stone-400">Nenhum produto cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-zinc-400">
              <tr className="border-b border-zinc-200 dark:border-white/10">
                <th className="py-2">Produto</th>
                <th className="py-2">Preço</th>
                <th className="py-2">Estoque</th>
                <th className="py-2">Movimentar</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {products.map((product) => (
                <tr key={product.id} className={product.isActive ? "" : "opacity-50"}>
                  <td className="py-2.5 font-medium text-zinc-900 dark:text-white">
                    {product.name}
                    {product.sku ? (
                      <span className="ml-2 text-xs text-zinc-400">{product.sku}</span>
                    ) : null}
                  </td>
                  <td className="py-2.5 text-zinc-600 dark:text-stone-300">
                    {brl(product.priceCents)}
                  </td>
                  <td
                    className={
                      product.stock <= 0
                        ? "py-2.5 font-semibold text-red-600 dark:text-red-400"
                        : "py-2.5 text-zinc-600 dark:text-stone-300"
                    }
                  >
                    {product.stock}
                  </td>
                  <td className="py-2.5">
                    <StockControl product={product} />
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(() => {
                          void updateProductAction(product.id, { isActive: !product.isActive });
                        })
                      }
                      className="text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-stone-200"
                    >
                      {product.isActive ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
