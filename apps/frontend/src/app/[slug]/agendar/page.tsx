import type { Metadata } from "next";
import { getTenant } from "../layout";
import { getClientToken, clientAuthedFetch } from "@/lib/client-session";
import { BookingWizard } from "@/components/booking/BookingWizard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant(slug);
  return { title: tenant ? `Agendar em ${tenant.name} - TotalAgenda` : "Negócio não encontrado" };
}

export default async function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = (await getTenant(slug))!;

  const token = await getClientToken(slug);
  const initialClient = token
    ? await clientAuthedFetch<{ name: string; phone: string }>(
        slug,
        `/public/tenants/${slug}/client-auth/me`,
      ).catch(() => null)
    : null;

  return (
    <main className="min-h-dvh bg-stone-50 px-6 py-16 dark:bg-zinc-950">
      <BookingWizard slug={tenant.slug} tenantName={tenant.name} initialClient={initialClient} />
    </main>
  );
}
