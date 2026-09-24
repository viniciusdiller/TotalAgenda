import { createHash, createHmac, timingSafeEqual } from "crypto";

// Autenticação da API interna (chamada pelo Admin-TotalSoftware, servidor a servidor). Cada requisição
// leva o timestamp e um HMAC-SHA256 do que ela FAZ: método, caminho COM query e hash do corpo. Assim
// não dá para reaproveitar uma assinatura em outra rota, outro filtro ou outro corpo, e o segredo nunca
// trafega (o webhook antigo mandava o segredo dentro do corpo, sem assinar o payload).
//
// O Admin tem uma cópia deste algoritmo (lib/internal-signature.ts). Os dois lados testam o MESMO vetor
// fixo (GOLDEN_VECTOR nos specs): se um divergir, o teste quebra.
export const INTERNAL_TIMESTAMP_HEADER = "x-internal-timestamp";
export const INTERNAL_SIGNATURE_HEADER = "x-internal-signature";

export const INTERNAL_MAX_AGE_MS = 5 * 60_000;
const MAX_FUTURE_SKEW_MS = 30_000;

export interface SignedRequestParts {
  method: string;
  path: string; // req.originalUrl: caminho + query
  body: Buffer | string | undefined;
  timestampMs: number;
}

function canonical({ method, path, body, timestampMs }: SignedRequestParts): string {
  const bodyHash = createHash("sha256")
    .update(body ?? "")
    .digest("hex");
  return `internal.v1\n${timestampMs}\n${method.toUpperCase()}\n${path}\n${bodyHash}`;
}

export function signInternalRequest(parts: SignedRequestParts, secret: string): string {
  return createHmac("sha256", secret).update(canonical(parts)).digest("hex");
}

// true só com assinatura válida e recente. Qualquer coisa fora do formato devolve false (nunca lança).
export function verifyInternalRequest(
  parts: Omit<SignedRequestParts, "timestampMs">,
  timestampHeader: string | string[] | undefined,
  signatureHeader: string | string[] | undefined,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (typeof timestampHeader !== "string" || typeof signatureHeader !== "string") return false;
  if (!/^\d{1,15}$/.test(timestampHeader)) return false;
  const timestampMs = Number(timestampHeader);
  if (now - timestampMs > INTERNAL_MAX_AGE_MS) return false;
  if (timestampMs - now > MAX_FUTURE_SKEW_MS) return false;
  if (!/^[0-9a-f]{64}$/.test(signatureHeader)) return false;

  const expected = Buffer.from(signInternalRequest({ ...parts, timestampMs }, secret), "hex");
  const received = Buffer.from(signatureHeader, "hex");
  return timingSafeEqual(expected, received);
}
