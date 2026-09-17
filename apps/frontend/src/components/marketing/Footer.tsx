import { Container } from "../ui/Container";
import { Logo } from "../brand/Logo";

const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL ??
  "https://totalsoftware.com.br/produtos";

// #como-funciona/#recursos/#faq são âncoras que só existem na home — em
// qualquer outra página (descobrir, [slug], etc.) viram link morto. isHome
// controla se essas colunas/links aparecem.
const accountLinks = [
  { href: "/entrar", label: "Entrar" },
  { href: LANDING_URL, label: "Começar grátis" },
];

export function Footer({ isHome = false }: { isHome?: boolean }) {
  return (
    <footer className="border-t border-zinc-200 py-14 dark:border-white/10">
      <Container>
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo markSize={28} />
            <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-stone-400">
              Agenda online para profissionais de beleza, salões e barbearias.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {isHome ? (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Produto
                </h3>
                <ul className="mt-4 flex flex-col gap-3">
                  <li>
                    <a
                      href="#como-funciona"
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white"
                    >
                      Como funciona
                    </a>
                  </li>
                  <li>
                    <a
                      href="#recursos"
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white"
                    >
                      Recursos
                    </a>
                  </li>
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Conta
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {accountLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                {isHome ? (
                  <li>
                    <a
                      href="#faq"
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white"
                    >
                      Perguntas frequentes
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
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
