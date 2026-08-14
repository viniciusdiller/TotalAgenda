import type { PublicTenant } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function TenantProfileHeader({ tenant }: { tenant: PublicTenant }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-(--tenant-accent)/15 via-transparent to-transparent"
      />
      <Container className="relative max-w-2xl py-20 text-center">
        {tenant.logoUrl ? (
          // <img> simples em vez de next/image: o domínio do backend varia por ambiente
          // (localhost em dev, domínio real em produção), então manter isso fora de
          // images.remotePatterns evita ter que sincronizar essa config por ambiente.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_URL}${tenant.logoUrl}`}
            alt={tenant.name}
            className="mx-auto h-24 w-24 rounded-2xl object-cover shadow-lg ring-1 ring-zinc-900/5 dark:ring-white/10"
          />
        ) : null}

        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl dark:text-white">
          {tenant.name}
        </h1>

        {tenant.description ? (
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-zinc-600 dark:text-stone-300">
            {tenant.description}
          </p>
        ) : null}

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="tenant" href={`/${tenant.slug}/agendar`}>
            Agendar
          </Button>
          <Button variant="ghost" href={`/${tenant.slug}/entrar`}>
            Entrar
          </Button>
        </div>
      </Container>
    </section>
  );
}
