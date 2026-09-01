import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { MyBookingsResponse } from "@totalagenda/shared-types";
import { getTenant } from "../layout";
import { clientAuthedFetch } from "@/lib/client-session";
import { ClientAccountView } from "@/components/client-account/ClientAccountView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant(slug);
  return { title: tenant ? `Minha conta em ${tenant.name} - TotalAgenda` : "Negócio não encontrado" };
}

export default async function ContaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // O layout já chama notFound() se o tenant não existisse, mas isso não impede este
  // componente de renderizar no mesmo passe — precisa da própria checagem.
  const tenant = await getTenant(slug);
  if (!tenant) {
    notFound();
  }

  const data = await clientAuthedFetch<MyBookingsResponse>(
    slug,
    `/public/tenants/${slug}/my-bookings`,
  ).catch(() => null);

  if (!data) {
    redirect(`/${slug}/entrar`);
  }

  return (
    <main className="min-h-dvh bg-stone-50 px-6 py-16 dark:bg-zinc-950">
      <ClientAccountView slug={slug} client={data.client} bookings={data.bookings} />
    </main>
  );
}
