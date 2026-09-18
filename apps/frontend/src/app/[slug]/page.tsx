import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import type { ConsumerMe, PublicBooking } from "@totalagenda/shared-types";
import { getTenant } from "./layout";
import { publicApi } from "@/lib/api";
import { marketplaceApi } from "@/lib/marketplace-api";
import { ApiError } from "@/lib/api";
import { getConsumerToken, consumerAuthedFetch } from "@/lib/consumer-session";
import { TenantProfileHeader } from "@/components/tenant-profile/TenantProfileHeader";
import { ServicesSection } from "@/components/tenant-profile/ServicesSection";
import { TeamSection } from "@/components/tenant-profile/TeamSection";
import { GallerySection } from "@/components/tenant-profile/GallerySection";
import { ContactSection } from "@/components/tenant-profile/ContactSection";
import { ReviewsSection } from "@/components/tenant-profile/ReviewsSection";

// Avaliações e categorias (tags do header) só existem pra tenant com
// listedInMarketplace: true (é o que a rota de marketplace exige) — não é toggle de
// exibição, é ausência de dado mesmo pra quem não está listado, então 404 aqui é
// esperado, não erro.
async function getMarketplaceData(slug: string) {
  try {
    const establishment = await marketplaceApi.establishment(slug);
    return {
      rating: establishment.rating,
      reviews: establishment.reviews,
      categories: establishment.categories,
    };
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) return null;
    throw err;
  }
}

// Dados do chip de perfil e do badge de "Compromissos" na navbar (ver TenantTopBar) — só
// existem quando o visitante está logado (conta global, cookie único, ver
// lib/consumer-session.ts). A lista de agendamentos cruza todos os salões, então o contador
// filtra pelos deste. Falha (token expirado, backend fora) degrada pra "deslogado" em vez de
// quebrar a página pública inteira por causa de uma conveniência de navbar.
async function getClientNav(slug: string) {
  const token = await getConsumerToken();
  if (!token) return null;

  try {
    const [me, bookings] = await Promise.all([
      consumerAuthedFetch<ConsumerMe>("/public/consumer/me"),
      consumerAuthedFetch<PublicBooking[]>("/public/consumer/bookings"),
    ]);
    const now = DateTime.now();
    const upcomingCount = bookings.filter(
      (b) =>
        b.tenant?.slug === slug && b.status === "CONFIRMED" && DateTime.fromISO(b.startAt) >= now,
    ).length;
    return { name: me.name, upcomingCount };
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
  const tenant = await getTenant(slug);
  return { title: tenant ? `${tenant.name} - TotalAgenda` : "Negócio não encontrado" };
}

export default async function TenantProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // O layout (app/[slug]/layout.tsx) chama notFound() se o tenant não existisse, mas isso
  // não impede este componente de renderizar no mesmo passe — precisa da própria checagem
  // (getTenant é cache()d, então isso não gera outro fetch).
  const tenant = await getTenant(slug);
  if (!tenant) {
    notFound();
  }

  const [services, team, marketplaceData, client] = await Promise.all([
    tenant.showServices ? publicApi.getServices(slug) : Promise.resolve([]),
    tenant.showTeam ? publicApi.getTeam(slug) : Promise.resolve([]),
    getMarketplaceData(slug),
    getClientNav(slug),
  ]);

  return (
    <main className="flex-1 bg-stone-50 dark:bg-zinc-950">
      <TenantProfileHeader
        tenant={tenant}
        rating={marketplaceData?.rating ?? null}
        categories={marketplaceData?.categories ?? []}
        client={client}
        servicesCount={services.length}
        teamCount={team.length}
      />
      {/* Ordem por prioridade real de decisão do cliente, não pela ordem em que os
          dados foram implementados: 1) prova visual do trabalho (o que mais pesa
          pra negócio de beleza) 2) o que tem e quanto custa 3) prova social
          reforçando a decisão 4) quem vai atender 5) logística de "como chegar",
          que só importa depois que a pessoa já decidiu marcar. */}
      {tenant.showGallery ? <GallerySection images={tenant.galleryImages} /> : null}
      {tenant.showServices ? <ServicesSection slug={slug} services={services} /> : null}
      {marketplaceData ? (
        <ReviewsSection rating={marketplaceData.rating} reviews={marketplaceData.reviews} />
      ) : null}
      {tenant.showTeam ? <TeamSection slug={slug} team={team} /> : null}
      {tenant.showContact ? <ContactSection tenant={tenant} /> : null}
    </main>
  );
}
