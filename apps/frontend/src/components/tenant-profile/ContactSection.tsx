import { MapPin, Clock, WhatsappLogo, InstagramLogo } from "@phosphor-icons/react/dist/ssr";
import type { PublicTenant } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";
import { Button } from "../ui/Button";

export function ContactSection({ tenant }: { tenant: PublicTenant }) {
  const hasInfo = tenant.address || tenant.businessHours;
  const hasLinks = tenant.whatsappNumber || tenant.instagramUrl;
  if (!hasInfo && !hasLinks) return null;

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

          {hasLinks ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {tenant.whatsappNumber ? (
                <Button variant="tenant" href={`https://wa.me/${tenant.whatsappNumber}`}>
                  <WhatsappLogo size={18} weight="bold" />
                  WhatsApp
                </Button>
              ) : null}
              {tenant.instagramUrl ? (
                <Button variant="ghost" href={tenant.instagramUrl}>
                  <InstagramLogo size={18} weight="bold" />
                  Instagram
                </Button>
              ) : null}
            </div>
          ) : null}
        </Container>
      </section>
    </Reveal>
  );
}
