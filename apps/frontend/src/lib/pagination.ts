// Lógica de paginação sem UI, reutilizável por qualquer listagem que use o contrato
// Paginated<T> do backend (shared-types). A página vive na URL (?pagina=2): o Server Component
// lê o parâmetro, pede só aquela fatia ao backend e o <Pagination> só gera links.

export type SearchParams = Record<string, string | string[] | undefined>;

// Aceita qualquer coisa vinda da query string e devolve um inteiro >= 1 (lixo vira 1).
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

// Monta o href de uma página preservando os outros parâmetros da URL (aba, filtros, outras
// paginações). A página 1 remove o parâmetro pra manter a URL limpa.
export function buildPageHref(
  pathname: string,
  searchParams: SearchParams,
  paramName: string,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === paramName || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  if (page > 1) params.set(paramName, String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

// Sequência de botões: sempre a primeira e a última página, a atual e uma vizinha de cada lado;
// o resto vira reticências. Ex.: página 6 de 12 → [1, "…", 5, 6, 7, "…", 12].
export function pageWindow(page: number, pageCount: number): Array<number | "…"> {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const result: Array<number | "…"> = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}
