import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// Repassa o IP do VISITANTE ao backend nas chamadas server-side (login NextAuth, Server Actions,
// renovação de sessão). Sem isso o backend enxerga só o IP deste servidor Next, o throttle por IP
// vira um balde único para o site inteiro e qualquer um derruba o login dos outros.
//
// O backend só confia no IP se vier assinado com CLIENT_IP_SECRET (segredo dos dois lados).
// Espelha apps/backend/src/common/utils/client-ip-signature.util.ts — ambos testam o mesmo vetor
// fixo, então o algoritmo não diverge em silêncio. Sem importar "server-only" de propósito:
// o proxy.ts e os testes (node --test) também usam este módulo.
export const CLIENT_IP_HEADER = "x-client-ip";
export const CLIENT_IP_TS_HEADER = "x-client-ip-ts";
export const CLIENT_IP_SIG_HEADER = "x-client-ip-sig";

export function signClientIp(ip: string, timestampMs: number, secret: string): string {
  return createHmac("sha256", secret).update(`client-ip.v1.${ip}.${timestampMs}`).digest("hex");
}

// X-Forwarded-For: cada proxy ACRESCENTA à direita. Com N proxies confiáveis na frente deste
// servidor, o IP do visitante é a N-ésima entrada contando da direita; o que estiver à esquerda
// foi mandado pelo próprio cliente e não vale nada. Atrás do nginx (1 salto) é a última entrada.
// Menos entradas que saltos, ou algo que não é IP: devolve null em vez de chutar.
export function extractClientIp(
  forwardedFor: string | null | undefined,
  trustedHops: number,
): string | null {
  if (!forwardedFor || !Number.isInteger(trustedHops) || trustedHops < 1) return null;
  const parts = forwardedFor
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const ip = parts[parts.length - trustedHops];
  return ip && isIP(ip) !== 0 ? ip : null;
}

// Só lê CLIENT_IP_SECRET e TRUSTED_PROXY_HOPS; aceita qualquer mapa de variáveis (process.env, teste).
type SignedHeadersEnv = Record<string, string | undefined>;

// Cabeçalhos a anexar na chamada ao backend. Vazio (comportamento antigo) se não há segredo
// configurado ou se não deu para ler um IP confiável — nunca impede a chamada.
export function signedVisitorHeaders(
  forwardedFor: string | null | undefined,
  env: SignedHeadersEnv = process.env,
  now: number = Date.now(),
): Record<string, string> {
  const secret = env.CLIENT_IP_SECRET;
  if (!secret) return {};
  const hops = Number(env.TRUSTED_PROXY_HOPS ?? 1);
  const ip = extractClientIp(forwardedFor, hops);
  if (!ip) return {};
  return {
    [CLIENT_IP_HEADER]: ip,
    [CLIENT_IP_TS_HEADER]: String(now),
    [CLIENT_IP_SIG_HEADER]: signClientIp(ip, now, secret),
  };
}
