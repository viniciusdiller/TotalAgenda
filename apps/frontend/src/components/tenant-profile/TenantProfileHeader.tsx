import { MapPin, Star } from "@phosphor-icons/react/dist/ssr";
import type { MarketplaceRating, PublicTenant } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";
import { Reveal } from "../ui/Reveal";
import { TenantTopBar } from "./TenantTopBar";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function TenantProfileHeader({
  tenant,
  rating,
}: {
  tenant: PublicTenant;
  rating: MarketplaceRating | null;
}) {
  // No máximo 2 — vira uma composição de "duas fotos jogadas na mesa", não um mosaico
  // que precisa de N imagens pra não ficar com buraco. Recortadas em caixas quase
  // quadradas (object-cover, nunca esticadas) em vez de banner largo e baixo.
  const photos = tenant.galleryImages.slice(0, 2);

  return (
    <>
      {/* Barra fixa própria (TenantTopBar) — mesmo peso visual que a marca tem no site
          principal (ver Nav.tsx), não um selo pequeno num canto. */}
      <TenantTopBar />

      <section>
        <Container
          className={`grid gap-10 pt-24 pb-14 lg:items-center lg:pt-28 lg:pb-20 ${photos.length > 0 ? "lg:grid-cols-[1.1fr_0.9fr]" : ""}`}
        >
          <Reveal>
            <div>
              <div className="flex items-center gap-3">
                {tenant.logoUrl ? (
                  // <img> simples em vez de next/image: o domínio do backend varia por
                  // ambiente (localhost em dev, domínio real em produção), então manter
                  // isso fora de images.remotePatterns evita sincronizar essa config por
                  // ambiente.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${API_URL}${tenant.logoUrl}?v=${encodeURIComponent(tenant.updatedAt)}`}
                    alt={tenant.name}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10"
                  />
                ) : null}
                <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl dark:text-white">
                  {tenant.name}
                </h1>
              </div>

              {tenant.description ? (
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-zinc-600 dark:text-stone-300">
                  {tenant.description}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="tenant" href={`/${tenant.slug}/agendar`}>
                  Agendar
                </Button>
                <Button variant="ghost" href={`/${tenant.slug}/entrar`}>
                  Entrar
                </Button>
              </div>

              {rating?.average != null || tenant.address ? (
                <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-500 dark:text-stone-400">
                  {rating?.average != null ? (
                    <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <Star size={14} weight="fill" />
                      {rating.average.toFixed(1)} · {rating.count}{" "}
                      {rating.count === 1 ? "avaliação" : "avaliações"}
                    </span>
                  ) : null}
                  {tenant.address ? (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="shrink-0" />
                      {tenant.address}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Reveal>

          {photos.length > 0 ? (
            <Reveal delay={0.12}>
              <div className="relative mx-auto aspect-4/3 w-full max-w-sm lg:mx-0 lg:max-w-none">
                <div className="absolute top-1 left-2 h-[76%] w-[68%] -rotate-3 overflow-hidden rounded-2xl shadow-xl ring-1 ring-zinc-900/5 dark:ring-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${API_URL}${photos[0].url}`} alt="" className="h-full w-full object-cover" />
                </div>
                {photos[1] ? (
                  <div className="absolute right-2 bottom-1 h-[58%] w-[50%] rotate-3 overflow-hidden rounded-2xl shadow-xl ring-4 ring-stone-50 dark:ring-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${API_URL}${photos[1].url}`} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>
            </Reveal>
          ) : null}
        </Container>
      </section>
    </>
  );
}
