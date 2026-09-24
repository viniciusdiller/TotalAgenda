import { createHmac, timingSafeEqual } from "crypto";
import { isIP } from "net";

// O throttle por IP só funciona se o backend enxergar o IP do VISITANTE. Chamadas feitas pelo
// servidor Next (login NextAuth, Server Actions) chegam com o IP do próprio servidor Next, então
// o site inteiro dividiria um único balde. O frontend repassa o IP do visitante nestes três
// cabeçalhos, assinados com um segredo que só os dois lados conhecem: quem chama o backend
// direto (o navegador) não consegue forjar um IP, porque não consegue assinar.
//
// O frontend tem uma cópia deste algoritmo (apps/frontend/src/lib/client-ip.ts). Os dois
// lados testam o MESMO vetor fixo (GOLDEN_VECTOR nos specs) — se um divergir, o teste quebra.
export const CLIENT_IP_HEADER = "x-client-ip";
export const CLIENT_IP_TS_HEADER = "x-client-ip-ts";
export const CLIENT_IP_SIG_HEADER = "x-client-ip-sig";

// Janela curta: um cabeçalho assinado capturado não vale por muito tempo.
export const CLIENT_IP_MAX_AGE_MS = 60_000;
const MAX_FUTURE_SKEW_MS = 5_000;

// Prefixo de versão/domínio: o mesmo segredo nunca produz uma assinatura válida para outro uso.
function canonical(ip: string, timestampMs: number): string {
  return `client-ip.v1.${ip}.${timestampMs}`;
}

export function signClientIp(ip: string, timestampMs: number, secret: string): string {
  return createHmac("sha256", secret).update(canonical(ip, timestampMs)).digest("hex");
}

type HeaderBag = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

// Devolve o IP assinado se — e só se — a assinatura for válida e recente. Qualquer outra coisa
// (cabeçalho ausente, repetido, malformado, expirado, assinatura errada) devolve null e o
// chamador cai no IP da conexão.
export function verifyClientIp(
  headers: HeaderBag,
  secret: string,
  now: number = Date.now(),
): string | null {
  const ip = single(headers[CLIENT_IP_HEADER]);
  const ts = single(headers[CLIENT_IP_TS_HEADER]);
  const sig = single(headers[CLIENT_IP_SIG_HEADER]);
  if (!ip || !ts || !sig) return null;

  if (isIP(ip) === 0) return null;
  if (!/^\d{1,15}$/.test(ts)) return null;
  const timestampMs = Number(ts);
  if (now - timestampMs > CLIENT_IP_MAX_AGE_MS) return null;
  if (timestampMs - now > MAX_FUTURE_SKEW_MS) return null;

  if (!/^[0-9a-f]{64}$/.test(sig)) return null;
  const expected = Buffer.from(signClientIp(ip, timestampMs, secret), "hex");
  const received = Buffer.from(sig, "hex");
  return timingSafeEqual(expected, received) ? ip : null;
}
