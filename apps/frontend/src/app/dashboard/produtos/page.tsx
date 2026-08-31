import { redirect } from "next/navigation";
import type { AdminProduct } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { ProductsManager } from "./ProductsManager";

export default async function ProdutosPage() {
  const session = await auth();
  if (session?.user.role === "PROFESSIONAL") {
    redirect("/dashboard");
  }

  const products = await authedFetch<AdminProduct[]>("/products?includeInactive=true").catch(
    () => [],
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Produtos</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Catálogo e estoque. O saldo baixa automaticamente ao fechar uma comanda com produto.
      </p>
      <ProductsManager products={products} />
    </div>
  );
}
