import type { PublicService } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${rest}` : `${hours}h`;
}

export function ServicesSection({ services }: { services: PublicService[] }) {
  if (services.length === 0) return null;

  return (
    <Reveal>
      <section className="border-t border-zinc-200 py-16 dark:border-white/10">
        <Container className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Serviços</h2>

          <ul className="mt-6 flex flex-col divide-y divide-zinc-200 dark:divide-white/10">
            {services.map((service) => (
              <li key={service.id} className="flex items-center justify-between gap-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-white">{service.name}</p>
                  {service.description ? (
                    <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-stone-400">
                      {service.description}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display font-semibold text-(--tenant-accent)">
                    {formatPrice(service.priceCents)}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-stone-500">
                    {formatDuration(service.durationMinutes)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </Reveal>
  );
}
