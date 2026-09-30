import { redirect } from "next/navigation";
import type { AdminProduct } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        title="Produtos"
        description="Catálogo e estoque. O saldo baixa automaticamente ao fechar uma comanda com produto."
      />
      <ProductsManager products={products} />
    </div>
  );
}
