import type { PublicProfessional } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function TeamSection({ team }: { team: PublicProfessional[] }) {
  if (team.length === 0) return null;

  return (
    <Reveal>
      <section className="border-t border-zinc-200 py-16 dark:border-white/10">
        <Container className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Equipe</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {team.map((professional) => (
              <div
                key={professional.id}
                className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-white/10"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--tenant-accent)/10 font-display text-sm font-semibold text-(--tenant-accent)">
                  {initials(professional.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-white">{professional.name}</p>
                  {professional.bio ? (
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-stone-400">
                      {professional.bio}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </Reveal>
  );
}
