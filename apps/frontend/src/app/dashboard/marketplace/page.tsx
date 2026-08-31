import { redirect } from "next/navigation";
import type { MarketplaceSettings as Settings, OwnerReview } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { MarketplaceSettings } from "./MarketplaceSettings";
import { ReviewsModeration } from "./ReviewsModeration";

export default async function MarketplacePage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    redirect("/dashboard");
  }

  const [settings, reviews] = await Promise.all([
    authedFetch<Settings>("/tenants/me/marketplace"),
    authedFetch<OwnerReview[]>("/reviews").catch(() => []),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Marketplace</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Apareça no portal de descoberta e responda às avaliações dos clientes.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Listagem</h2>
        <MarketplaceSettings settings={settings} />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Avaliações</h2>
        <ReviewsModeration reviews={reviews} />
      </section>
    </div>
  );
}
