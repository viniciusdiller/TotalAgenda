import { MapPin, Clock } from "@phosphor-icons/react/dist/ssr";
import type { PublicTenant } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function TenantProfileHeader({ tenant }: { tenant: PublicTenant }) {
  return (
    <Container className="max-w-2xl py-16">
      <div className="flex flex-col items-center text-center">
        {tenant.logoUrl ? (
          // <img> simples em vez de next/image: o domínio do backend varia por ambiente
          // (localhost em dev, domínio real em produção), então manter isso fora de
          // images.remotePatterns evita ter que sincronizar essa config por ambiente.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_URL}${tenant.logoUrl}`}
            alt={tenant.name}
            className="h-24 w-24 rounded-2xl object-cover shadow-lg ring-1 ring-zinc-900/5 dark:ring-white/10"
          />
        ) : null}

        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-white">
          {tenant.name}
        </h1>

        {tenant.description ? (
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-zinc-600 dark:text-stone-300">
            {tenant.description}
          </p>
        ) : null}

        {tenant.address || tenant.businessHours ? (
          <div className="mt-5 flex flex-col items-center gap-1.5 text-sm text-zinc-500 dark:text-stone-400">
            {tenant.address ? (
              <span className="flex items-center gap-1.5">
                <MapPin size={16} />
                {tenant.address}
              </span>
            ) : null}
            {tenant.businessHours ? (
              <span className="flex items-center gap-1.5">
                <Clock size={16} />
                {tenant.businessHours}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="tenant" href={`/${tenant.slug}/agendar`}>
            Agendar
          </Button>
          <Button variant="ghost" href={`/${tenant.slug}/entrar`}>
            Entrar
          </Button>
        </div>
      </div>
    </Container>
  );
}
