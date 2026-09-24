import {
  CLIENT_IP_HEADER,
  CLIENT_IP_MAX_AGE_MS,
  CLIENT_IP_SIG_HEADER,
  CLIENT_IP_TS_HEADER,
  signClientIp,
  verifyClientIp,
} from "./client-ip-signature.util";

const SECRET = "0123456789abcdef0123456789abcdef";
const NOW = 1_700_000_000_000;

// Vetor fixo, idêntico ao de apps/frontend/src/lib/client-ip.test.ts: garante que o algoritmo do
// frontend (que assina) e o do backend (que verifica) nunca divirjam sem um teste quebrar.
const GOLDEN_VECTOR = {
  ip: "203.0.113.7",
  timestampMs: 1_700_000_000_000,
  secret: SECRET,
  signature: "b044c3f60bfa72210778b1a83c08ad6af87271aa9f36576e7db8bfc23106cead",
};

function headersFor(ip: string, ts: number, secret = SECRET) {
  return {
    [CLIENT_IP_HEADER]: ip,
    [CLIENT_IP_TS_HEADER]: String(ts),
    [CLIENT_IP_SIG_HEADER]: signClientIp(ip, ts, secret),
  };
}

describe("client-ip-signature", () => {
  it("bate com o vetor fixo compartilhado com o frontend", () => {
    expect(signClientIp(GOLDEN_VECTOR.ip, GOLDEN_VECTOR.timestampMs, GOLDEN_VECTOR.secret)).toBe(
      GOLDEN_VECTOR.signature,
    );
  });

  it("aceita IPv4 e IPv6 assinados e recentes", () => {
    expect(verifyClientIp(headersFor("203.0.113.7", NOW), SECRET, NOW)).toBe("203.0.113.7");
    expect(verifyClientIp(headersFor("2001:db8::1", NOW), SECRET, NOW)).toBe("2001:db8::1");
  });

  it("recusa IP adulterado depois de assinado", () => {
    const headers = { ...headersFor("203.0.113.7", NOW), [CLIENT_IP_HEADER]: "198.51.100.9" };
    expect(verifyClientIp(headers, SECRET, NOW)).toBeNull();
  });

  it("recusa timestamp adulterado (troca para revalidar uma assinatura velha)", () => {
    const headers = { ...headersFor("203.0.113.7", NOW - 1000), [CLIENT_IP_TS_HEADER]: String(NOW) };
    expect(verifyClientIp(headers, SECRET, NOW)).toBeNull();
  });

  it("recusa assinatura feita com outro segredo", () => {
    expect(verifyClientIp(headersFor("203.0.113.7", NOW, "x".repeat(32)), SECRET, NOW)).toBeNull();
  });

  it("recusa assinatura expirada e aceita no limite da janela", () => {
    expect(verifyClientIp(headersFor("203.0.113.7", NOW - CLIENT_IP_MAX_AGE_MS), SECRET, NOW)).toBe(
      "203.0.113.7",
    );
    expect(
      verifyClientIp(headersFor("203.0.113.7", NOW - CLIENT_IP_MAX_AGE_MS - 1), SECRET, NOW),
    ).toBeNull();
  });

  it("recusa timestamp muito no futuro (relógio fora de sincronia ou replay preparado)", () => {
    expect(verifyClientIp(headersFor("203.0.113.7", NOW + 4_000), SECRET, NOW)).toBe("203.0.113.7");
    expect(verifyClientIp(headersFor("203.0.113.7", NOW + 6_000), SECRET, NOW)).toBeNull();
  });

  it.each([
    ["IP malformado", { [CLIENT_IP_HEADER]: "999.1.1.1" }],
    ["IP com lixo", { [CLIENT_IP_HEADER]: "203.0.113.7, 10.0.0.1" }],
    ["timestamp não numérico", { [CLIENT_IP_TS_HEADER]: "agora" }],
    ["timestamp negativo", { [CLIENT_IP_TS_HEADER]: "-5" }],
    ["assinatura curta", { [CLIENT_IP_SIG_HEADER]: "abc" }],
    ["assinatura não-hex", { [CLIENT_IP_SIG_HEADER]: "z".repeat(64) }],
    ["assinatura em maiúsculas", { [CLIENT_IP_SIG_HEADER]: "B".repeat(64) }],
  ])("recusa %s sem lançar exceção", (_label, patch) => {
    const headers = { ...headersFor("203.0.113.7", NOW), ...patch };
    expect(() => verifyClientIp(headers, SECRET, NOW)).not.toThrow();
    expect(verifyClientIp(headers, SECRET, NOW)).toBeNull();
  });

  it("recusa cabeçalho ausente ou repetido (array)", () => {
    const ok = headersFor("203.0.113.7", NOW);
    expect(verifyClientIp({}, SECRET, NOW)).toBeNull();
    expect(verifyClientIp({ ...ok, [CLIENT_IP_SIG_HEADER]: undefined }, SECRET, NOW)).toBeNull();
    expect(
      verifyClientIp({ ...ok, [CLIENT_IP_HEADER]: ["203.0.113.7", "198.51.100.9"] }, SECRET, NOW),
    ).toBeNull();
  });
});
