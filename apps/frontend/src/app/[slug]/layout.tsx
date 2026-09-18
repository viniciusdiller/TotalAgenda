import { cache } from "react";
import { notFound } from "next/navigation";
import { publicApi, ApiError } from "@/lib/api";
import { TenantFooter } from "@/components/tenant-profile/TenantFooter";

// Mesmo valor de --color-accent-500 em app/globals.css — usado quando o tenant não
// escolheu uma cor de destaque própria. Precisa ficar em sync com o defaultValue do
// input de cor em dashboard/configuracoes/TenantProfileSettingsForm.tsx: como
// <input type="color"> sempre tem um valor, salvar o formulário sem mexer na cor
// submete esse default de qualquer forma (não fica null) — os dois têm que bater.
export const DEFAULT_TENANT_ACCENT = "#6c3bf4";

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
      className="flex min-h-dvh flex-col"
    >
      {children}
      <TenantFooter tenant={tenant} />
    </div>
  );
}
