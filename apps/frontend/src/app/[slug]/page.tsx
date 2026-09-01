import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenant } from "./layout";
import { publicApi } from "@/lib/api";
import { TenantProfileHeader } from "@/components/tenant-profile/TenantProfileHeader";
import { ServicesSection } from "@/components/tenant-profile/ServicesSection";
import { TeamSection } from "@/components/tenant-profile/TeamSection";
import { GallerySection } from "@/components/tenant-profile/GallerySection";
import { ContactSection } from "@/components/tenant-profile/ContactSection";

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

  const [services, team] = await Promise.all([
    tenant.showServices ? publicApi.getServices(slug) : Promise.resolve([]),
    tenant.showTeam ? publicApi.getTeam(slug) : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-zinc-950">
      <TenantProfileHeader tenant={tenant} />
      {tenant.showServices ? <ServicesSection services={services} /> : null}
      {tenant.showTeam ? <TeamSection team={team} /> : null}
      {tenant.showGallery ? <GallerySection images={tenant.galleryImages} /> : null}
      {tenant.showContact ? <ContactSection tenant={tenant} /> : null}
    </main>
  );
}
