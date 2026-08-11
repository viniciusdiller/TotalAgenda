import { ChatsCircle, ClockCounterClockwise, XCircle } from "@phosphor-icons/react/dist/ssr";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";

const pains = [
  {
    icon: ChatsCircle,
    title: "Cliente marca por mensagem",
    body: "Cada agendamento vira uma troca de mensagens no WhatsApp ou Instagram, e é fácil perder alguma no meio da correria do dia.",
  },
  {
    icon: XCircle,
    title: "Horário duplicado",
    body: "Sem uma agenda central, dois clientes acabam marcando o mesmo horário com o mesmo profissional.",
  },
  {
    icon: ClockCounterClockwise,
    title: "Sem controle real da semana",
    body: "Fica difícil enxergar quem está livre, quando, e quanto ainda cabe na agenda de cada profissional.",
  },
];

export function ProblemSolution() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <Reveal>
          <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-white">
            Marcar horário não devia ser o trabalho mais difícil do dia
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-x-8 gap-y-10 md:grid-cols-3">
          {pains.map((pain, i) => (
            <Reveal key={pain.title} delay={i * 0.08}>
              <pain.icon size={28} weight="light" className="text-accent-500" />
              <h3 className="mt-4 font-display text-lg font-semibold text-zinc-900 dark:text-white">
                {pain.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-zinc-600 dark:text-stone-300">
                {pain.body}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
