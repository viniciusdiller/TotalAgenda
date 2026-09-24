// Guarda dos caminhos que o frontend monta para chamar o backend (`/clients/${id}`, `/public/tenants/${slug}`).
// O `id`/`slug` vem da URL da página ou dos argumentos de uma Server Action — ou seja, do cliente. Sem esta
// checagem, um valor como "../auth/refresh" ou "x?admin=1" mudaria PARA ONDE a chamada autenticada vai
// (o `fetch` normaliza "..", e "?" abre uma query): o token do próprio usuário seria usado num endpoint
// que ele não escolheu (confused deputy). O host nunca muda (vem de NEXT_PUBLIC_API_URL), então não é
// SSRF, mas o caminho também não pode ser controlado por quem chama.
//
// Regras: começa com uma única "/"; sem "..", "//", "\\", "#", espaço ou controle; nenhum "%2e/%2f/%5c"
// (formas codificadas do mesmo truque). A query (depois do primeiro "?") só não pode ter espaço/controle/"#".
const UNSAFE_PATH = /(^\/\/)|(\.\.)|(\/\/)|\\|#|[\s\u0000-\u001f\u007f]|%(2e|2f|5c|00)/i;
const UNSAFE_QUERY = /#|[\s\u0000-\u001f\u007f]/;

export function isSafeApiPath(path: string): boolean {
  if (typeof path !== "string" || !path.startsWith("/")) return false;
  const q = path.indexOf("?");
  const pathname = q === -1 ? path : path.slice(0, q);
  const query = q === -1 ? "" : path.slice(q + 1);
  return !UNSAFE_PATH.test(pathname) && !UNSAFE_QUERY.test(query);
}

export function assertSafeApiPath(path: string): string {
  if (!isSafeApiPath(path)) throw new Error("Caminho de API inválido.");
  return path;
}
