import { Container } from "../ui/Container";

const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL ??
  "https://totalsoftware.com.br/produtos";

const columns = [
  {
    title: "Produto",
    links: [
      { href: "#como-funciona", label: "Como funciona" },
      { href: "#recursos", label: "Recursos" },
    ],
  },
  {
    title: "Conta",
    links: [
      { href: "/entrar", label: "Entrar" },
      { href: LANDING_URL, label: "Começar grátis" },
      { href: "#faq", label: "Perguntas frequentes" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-14 dark:border-white/10">
      <Container>
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <span className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
              TotalAgenda
            </span>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-stone-400">
              Agenda online para profissionais de beleza, salões e barbearias.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {column.title}
                </h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-white/10 dark:text-stone-400">
          © {new Date().getFullYear()} TotalAgenda. Todos os direitos
          reservados.
        </div>
      </Container>
    </footer>
  );
}
