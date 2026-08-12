import type { Metadata } from "next";
import { getTenant } from "./layout";
import { TenantProfileHeader } from "@/components/tenant-profile/TenantProfileHeader";

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
  // O layout (app/[slug]/layout.tsx) já chamou notFound() se o tenant não existisse — aqui
  // é seguro assumir que existe (getTenant é cache()d, então isso não gera outro fetch).
  const tenant = (await getTenant(slug))!;

  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-zinc-950">
      <TenantProfileHeader tenant={tenant} />
    </main>
  );
}
