import Link from "next/link";
import clsx from "clsx";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { buildPageHref, pageWindow, type SearchParams } from "@/lib/pagination";

interface PaginationProps {
  page: number;
  pageCount: number;
  // Rota da listagem e os searchParams atuais: os outros parâmetros (aba, filtros) são
  // preservados nos links.
  pathname: string;
  searchParams: SearchParams;
  // Nome do parâmetro de página — permite duas listagens paginadas na mesma tela
  // (?proximos=2&historico=3) sem uma resetar a outra.
  paramName?: string;
  label?: string;
  className?: string;
}

const BASE =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500";

// Paginação por links (Server Component, sem JS): funciona com qualquer listagem que devolva
// { page, pageCount } (contrato Paginated<T>). Some sozinha quando há uma página só.
export function Pagination({
  page,
  pageCount,
  pathname,
  searchParams,
  paramName = "pagina",
  label = "Paginação",
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const href = (p: number) => buildPageHref(pathname, searchParams, paramName, p);
  const arrow = (disabled: boolean) =>
    clsx(
      BASE,
      disabled
        ? "pointer-events-none text-zinc-300 dark:text-white/20"
        : "text-zinc-700 hover:bg-zinc-900/5 dark:text-stone-200 dark:hover:bg-white/10",
    );

  return (
    <nav aria-label={label} className={clsx("flex items-center justify-center gap-1", className)}>
      <Link
        href={href(Math.max(1, page - 1))}
        aria-label="Página anterior"
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        scroll={false}
        className={arrow(page <= 1)}
      >
        <CaretLeft size={16} weight="bold" />
      </Link>

      {pageWindow(page, pageCount).map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-sm text-zinc-400">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-label={`Página ${item}`}
            aria-current={item === page ? "page" : undefined}
            scroll={false}
            className={clsx(
              BASE,
              item === page
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-900/5 dark:text-stone-300 dark:hover:bg-white/10",
            )}
          >
            {item}
          </Link>
        ),
      )}

      <Link
        href={href(Math.min(pageCount, page + 1))}
        aria-label="Próxima página"
        aria-disabled={page >= pageCount}
        tabIndex={page >= pageCount ? -1 : undefined}
        scroll={false}
        className={arrow(page >= pageCount)}
      >
        <CaretRight size={16} weight="bold" />
      </Link>
    </nav>
  );
}
