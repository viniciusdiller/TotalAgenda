import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";
import { Button } from "../ui/Button";

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://totalsoftware.com.br";

export function FinalCta() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-zinc-900 px-8 py-16 text-center sm:px-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-accent-500/20 via-transparent to-transparent"
            />
            <h2 className="relative font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
              Comece a organizar sua agenda hoje
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-[15px] text-stone-300">
              Leva menos de cinco minutos para cadastrar seus serviços e
              começar a receber agendamentos pelo link.
            </p>
            <div className="relative mt-9 flex justify-center">
              <Button href={LANDING_URL}>Começar grátis</Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
