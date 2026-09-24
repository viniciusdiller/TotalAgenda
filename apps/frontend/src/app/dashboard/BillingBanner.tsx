import Link from "next/link";
import clsx from "clsx";
import { type BillingStatusResponse, bannerFor } from "@/lib/billing";

// Aviso fixo no topo do dashboard. O texto e a regra de quando aparece vivem em lib/billing.ts
// (testados); aqui só a apresentação, com o caminho para resolver: a tela de plano.
export function BillingBanner({ billing }: { billing: BillingStatusResponse }) {
  const banner = bannerFor(billing);
  if (!banner) return null;

  return (
    <div
      role="status"
      className={clsx(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-6 py-2.5 text-sm font-medium",
        banner.tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
      )}
    >
      <span>{banner.message}</span>
      <Link href="/dashboard/plano" className="font-semibold underline underline-offset-2 hover:no-underline">
        {banner.ctaLabel}
      </Link>
    </div>
  );
}
