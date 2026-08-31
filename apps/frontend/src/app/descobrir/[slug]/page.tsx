import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { CaretLeft, MapPin, Star } from "@phosphor-icons/react/dist/ssr";
import type { MarketplaceEstablishment } from "@totalagenda/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function getEstablishment(slug: string): Promise<MarketplaceEstablishment | null> {
  try {
    const res = await fetch(`${API_URL}/public/marketplace/establishments/${slug}`, {
      next: { revalidate: 120 },
    });
    return res.ok ? ((await res.json()) as MarketplaceEstablishment) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEstablishment(slug);
  if (!e) return { title: "Estabelecimento não encontrado" };
  const where = [e.neighborhood, e.city].filter(Boolean).join(", ");
  return {
    title: `${e.name}${where ? ` — ${where}` : ""} | TotalAgenda`,
    description:
      e.description ??
      `Agende online em ${e.name}${where ? `, ${where}` : ""}. ${
        e.rating.average ? `Nota ${e.rating.average} (${e.rating.count} avaliações).` : ""
      }`,
  };
}

export default async function EstablishmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = await getEstablishment(slug);
  if (!e) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: e.name,
    description: e.description ?? undefined,
    address: e.address ?? undefined,
    ...(e.latitude != null && e.longitude != null
      ? { geo: { "@type": "GeoCoordinates", latitude: e.latitude, longitude: e.longitude } }
      : {}),
    ...(e.rating.average != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: e.rating.average,
            reviewCount: e.rating.count,
          },
        }
      : {}),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/descobrir"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white"
      >
        <CaretLeft size={14} />
        Descobrir
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold text-zinc-900 dark:text-white">
        {e.name}
      </h1>
      <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500 dark:text-stone-400">
        <MapPin size={14} />
        {[e.address, e.neighborhood, e.city].filter(Boolean).join(" · ")}
      </p>
      {e.rating.average != null ? (
        <p className="mt-1 flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
          <Star size={14} weight="fill" />
          {e.rating.average.toFixed(1)} · {e.rating.count} avaliações
        </p>
      ) : null}

      {e.description ? (
        <p className="mt-4 text-zinc-700 dark:text-stone-300">{e.description}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {e.categories.map((c) => (
          <span
            key={c.slug}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-white/5 dark:text-stone-300"
          >
            {c.name}
          </span>
        ))}
      </div>

      <Link
        href={`/${e.slug}/agendar`}
        className="mt-6 inline-block rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600"
      >
        Agendar horário
      </Link>

      {e.services.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Serviços</h2>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm dark:divide-white/5">
            {e.services.map((s) => (
              <li key={s.id} className="flex justify-between py-2">
                <span className="text-zinc-700 dark:text-stone-200">
                  {s.name} <span className="text-zinc-400">· {s.durationMinutes} min</span>
                </span>
                <span className="text-zinc-500">{brl(s.priceCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Avaliações</h2>
        {e.reviews.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-stone-400">
            Ainda sem avaliações.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {e.reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-zinc-200 p-3 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13} weight={i < r.rating ? "fill" : "regular"} />
                    ))}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {DateTime.fromISO(r.createdAt).setLocale("pt-BR").toFormat("dd/LL/yyyy")}
                  </span>
                </div>
                {r.comment ? (
                  <p className="mt-2 text-sm text-zinc-700 dark:text-stone-300">{r.comment}</p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-400">{r.authorName}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
