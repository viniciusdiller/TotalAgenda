import { cache } from "react";
import { notFound } from "next/navigation";
import { publicApi, ApiError } from "@/lib/api";

// Mesmo valor de --color-accent-500 em app/globals.css — usado quando o tenant não
// escolheu uma cor de destaque própria.
export const DEFAULT_TENANT_ACCENT = "#c2255c";

// cache() dedupa chamadas repetidas dentro da mesma requisição: layout + page (e
// agendar/entrar/conta) podem cada um chamar getTenant(slug) sem gerar fetches extras.
export const getTenant = cache(async (slug: string) => {
  try {
    return await publicApi.getTenant(slug);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      return null;
    }
    throw err;
  }
});

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenant(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <div
      style={{ "--tenant-accent": tenant.accentColor || DEFAULT_TENANT_ACCENT } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
