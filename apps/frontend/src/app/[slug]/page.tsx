import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenant } from "./layout";
import { publicApi } from "@/lib/api";
import { marketplaceApi } from "@/lib/marketplace-api";
import { ApiError } from "@/lib/api";
import { TenantProfileHeader } from "@/components/tenant-profile/TenantProfileHeader";
import { ServicesSection } from "@/components/tenant-profile/ServicesSection";
import { TeamSection } from "@/components/tenant-profile/TeamSection";
import { GallerySection } from "@/components/tenant-profile/GallerySection";
import { ContactSection } from "@/components/tenant-profile/ContactSection";
import { ReviewsSection } from "@/components/tenant-profile/ReviewsSection";

// Avaliações só existem pra tenant com listedInMarketplace: true (é o que a rota de
// marketplace exige) — não é toggle de exibição, é ausência de dado mesmo pra quem não
// está listado, então 404 aqui é esperado, não erro.
async function getReviews(slug: string) {
  try {
    const establishment = await marketplaceApi.establishment(slug);
    return { rating: establishment.rating, reviews: establishment.reviews };
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) return null;
    throw err;
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

  const [services, team, reviewsData] = await Promise.all([
    tenant.showServices ? publicApi.getServices(slug) : Promise.resolve([]),
    tenant.showTeam ? publicApi.getTeam(slug) : Promise.resolve([]),
    getReviews(slug),
  ]);

  return (
    <main className="flex-1 bg-stone-50 dark:bg-zinc-950">
      <TenantProfileHeader tenant={tenant} rating={reviewsData?.rating ?? null} />
      {/* Ordem por prioridade real de decisão do cliente, não pela ordem em que os
          dados foram implementados: 1) prova visual do trabalho (o que mais pesa
          pra negócio de beleza) 2) o que tem e quanto custa 3) prova social
          reforçando a decisão 4) quem vai atender 5) logística de "como chegar",
          que só importa depois que a pessoa já decidiu marcar. */}
      {tenant.showGallery ? <GallerySection images={tenant.galleryImages} /> : null}
      {tenant.showServices ? <ServicesSection services={services} /> : null}
      {reviewsData ? (
        <ReviewsSection rating={reviewsData.rating} reviews={reviewsData.reviews} />
      ) : null}
      {tenant.showTeam ? <TeamSection team={team} /> : null}
      {tenant.showContact ? <ContactSection tenant={tenant} /> : null}
    </main>
  );
}
