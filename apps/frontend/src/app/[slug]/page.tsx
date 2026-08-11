import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publicApi, ApiError } from "@/lib/api";
import { BookingWizard } from "@/components/booking/BookingWizard";

async function getTenant(slug: string) {
  try {
    return await publicApi.getTenant(slug);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      return null;
    }
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
  return { title: tenant ? `Agendar em ${tenant.name} - TotalAgenda` : "Negócio não encontrado" };
}

export default async function TenantBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenant(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-stone-50 px-6 py-16 dark:bg-zinc-950">
      <BookingWizard slug={tenant.slug} tenantName={tenant.name} />
    </main>
  );
}
