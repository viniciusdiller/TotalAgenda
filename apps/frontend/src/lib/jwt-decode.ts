// Sem verificar assinatura — só pra saber quando parar de usar um token e chamar o endpoint de
// refresh correspondente (staff: /auth/refresh; cliente: /public/consumer/refresh). A validade
// de verdade é sempre checada pelo backend.
//
// atob() em vez de Buffer: usado também dentro de proxy.ts (Edge Runtime), que não tem Buffer —
// usar Buffer aqui faz estourar só no proxy (não nas páginas, que rodam em Node.js), derrubando
// a sessão de forma intermitente ali.
export function decodeJwtExpiryMs(token: string): number {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const payload = JSON.parse(atob(padded)) as { exp: number };
  return payload.exp * 1000;
}
