import type { Metadata } from "next";
import Link from "next/link";
import type { MarketplaceCategory } from "@totalagenda/shared-types";
import { DiscoverSearch } from "./DiscoverSearch";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const metadata: Metadata = {
  title: "Descobrir salões e barbearias | TotalAgenda",
  description:
    "Encontre salões de beleza e barbearias perto de você, veja avaliações e agende online.",
};

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default async function DescobrirPage() {
  const [categories, cities] = await Promise.all([
    fetchJson<MarketplaceCategory[]>("/public/marketplace/categories", []),
    fetchJson<string[]>("/public/marketplace/cities", []),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-white">Descobrir</h1>
        <Link
          href="/descobrir/avaliar"
          className="text-sm font-medium text-accent-600 dark:text-accent-300"
        >
          Avaliar uma visita
        </Link>
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Salões e barbearias perto de você, com avaliações de quem já foi.
      </p>

      <div className="mt-6">
        <DiscoverSearch categories={categories} cities={cities} />
      </div>
    </main>
  );
}
