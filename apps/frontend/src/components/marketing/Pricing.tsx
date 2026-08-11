import { Check } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";
import { Button } from "../ui/Button";

const plans = [
  {
    name: "Essencial",
    price: "R$ 29,90",
    description: "Para quem está começando a organizar a agenda.",
    features: ["Até 2 profissionais", "Agendamentos ilimitados", "Link personalizado"],
    highlighted: false,
  },
  {
    name: "Profissional",
    price: "R$ 79,90",
    description: "Para salões com equipe e agenda cheia.",
    features: [
      "Até 5 profissionais",
      "Agendamentos ilimitados",
      "Relatórios do negócio",
      "WhatsApp (em breve)",
    ],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "R$ 149,90",
    description: "Para negócios maiores, sem limite de equipe.",
    features: ["Profissionais ilimitados", "Suporte prioritário", "Acesso antecipado a API"],
    highlighted: false,
  },
];

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://totalsoftware.com.br";

export function Pricing() {
  return (
    <section id="planos" className="bg-white py-20 lg:py-28 dark:bg-zinc-900/40">
      <Container>
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-white">
            Planos que crescem com sua equipe
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-zinc-600 dark:text-stone-300">
            14 dias grátis em qualquer plano, sem cartão de crédito. Cancele
            quando quiser.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08}>
              <div
                className={clsx(
                  "flex h-full flex-col rounded-2xl p-8",
                  plan.highlighted
                    ? "bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 md:-translate-y-3"
                    : "border border-zinc-200 dark:border-white/10",
                )}
              >
                {plan.highlighted ? (
                  <span className="mb-4 inline-flex w-fit items-center rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white">
                    Mais escolhido
                  </span>
                ) : null}

                <h3
                  className={clsx(
                    "font-display text-lg font-semibold",
                    plan.highlighted ? "text-white" : "text-zinc-900 dark:text-white",
                  )}
                >
                  {plan.name}
                </h3>
                <p
                  className={clsx(
                    "mt-1 text-sm",
                    plan.highlighted ? "text-stone-300" : "text-zinc-500 dark:text-stone-400",
                  )}
                >
                  {plan.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{plan.price}</span>
                  <span className={plan.highlighted ? "text-stone-300" : "text-zinc-500 dark:text-stone-400"}>
                    /mês
                  </span>
                </div>

                <ul className="mt-8 flex flex-1 flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        size={18}
                        weight="bold"
                        className={plan.highlighted ? "mt-0.5 text-accent-400" : "mt-0.5 text-accent-500"}
                      />
                      <span className={plan.highlighted ? "text-stone-200" : "text-zinc-700 dark:text-stone-300"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  href={LANDING_URL}
                  variant={plan.highlighted ? "primary" : "ghost"}
                  className={clsx("mt-8 w-full", !plan.highlighted && "dark:ring-white/20")}
                >
                  Começar grátis
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
