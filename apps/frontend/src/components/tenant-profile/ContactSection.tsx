import { MapPin, Clock, WhatsappLogo, InstagramLogo } from "@phosphor-icons/react/dist/ssr";
import type { PublicTenant } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";
import { Button } from "../ui/Button";

// Extrai só o @handle da URL pra exibir no cartão — a URL completa fica só no href.
function instagramHandle(url: string): string | null {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "").split("/").pop();
    return path ? `@${path}` : null;
  } catch {
    return null;
  }
}

export function ContactSection({ tenant }: { tenant: PublicTenant }) {
  const hasInfo = tenant.address || tenant.businessHours;
  const hasLinks = tenant.whatsappNumber || tenant.instagramUrl;
  if (!hasInfo && !hasLinks) return null;

  const handle = tenant.instagramUrl ? instagramHandle(tenant.instagramUrl) : null;

  return (
    <Reveal>
      <section className="border-t border-zinc-200 py-16 dark:border-white/10">
        <Container className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Contato</h2>

          {hasInfo ? (
            <div className="mt-6 flex flex-col gap-2.5 text-sm text-zinc-600 dark:text-stone-300">
              {tenant.address ? (
                <span className="flex items-center gap-2">
                  <MapPin size={18} className="shrink-0 text-(--tenant-accent)" />
                  {tenant.address}
                </span>
              ) : null}
              {tenant.businessHours ? (
                <span className="flex items-center gap-2">
                  <Clock size={18} className="shrink-0 text-(--tenant-accent)" />
                  {tenant.businessHours}
                </span>
              ) : null}
            </div>
          ) : null}

          {tenant.address ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
              <iframe
                title={`Mapa de ${tenant.name}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(tenant.address)}&output=embed`}
                className="h-56 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}

          {hasLinks ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {tenant.whatsappNumber ? (
                <Button variant="tenant" href={`https://wa.me/${tenant.whatsappNumber}`}>
                  <WhatsappLogo size={18} weight="bold" />
                  WhatsApp
                </Button>
              ) : null}
              {tenant.instagramUrl ? (
                <a
                  href={tenant.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#dc2743]/20 transition-opacity hover:opacity-90"
                >
                  <InstagramLogo size={18} weight="bold" />
                  {handle ?? "Instagram"}
                </a>
              ) : null}
            </div>
          ) : null}
        </Container>
      </section>
    </Reveal>
  );
}
