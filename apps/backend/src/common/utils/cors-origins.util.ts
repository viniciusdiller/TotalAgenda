// Origens que o navegador pode chamar esta API: o app (FRONTEND_URL) e, opcionalmente, o site institucional
// (SITE_URL), que só lê GET /plans (preços). Só a ORIGEM conta (protocolo + host + porta): "https://x.com/" e
// "https://x.com/pagina" viram "https://x.com", que é o que o navegador manda no cabeçalho Origin.
// Nunca "*" nem reflexo do Origin recebido: só o que está configurado.
export function corsOrigins(env: { FRONTEND_URL?: string; SITE_URL?: string }): string[] {
  const origins = new Set<string>();
  for (const value of [env.FRONTEND_URL ?? "http://localhost:3000", env.SITE_URL]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // valor inválido: já barrado por env.validation; aqui só ignora em vez de abrir a porta
    }
  }
  return [...origins];
}
