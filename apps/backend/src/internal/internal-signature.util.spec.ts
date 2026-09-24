import {
  INTERNAL_MAX_AGE_MS,
  signInternalRequest,
  verifyInternalRequest,
} from "./internal-signature.util";

const SECRET = "0123456789abcdef0123456789abcdef";
const NOW = 1_700_000_000_000;
const PARTS = {
  method: "POST",
  path: "/internal/tenants/abc/password-reset-link?x=1",
  body: '{"actor":"a@b.com"}',
};

// Vetor fixo, idêntico ao do Admin (lib/internal-signature.test.mjs): se o algoritmo mudar de um lado só,
// um dos dois testes quebra.
const GOLDEN_SIGNATURE = "fe03bf0ba11d5b3c5462d51793e70a4627d144b92b3e111b9a51d4a61f094e6a";

const sign = (over: Partial<typeof PARTS> = {}, ts = NOW, secret = SECRET) =>
  signInternalRequest({ ...PARTS, ...over, timestampMs: ts }, secret);
// ts: null = cabeçalho ausente (undefined acionaria o valor padrão do parâmetro).
const verify = (over: Partial<typeof PARTS> = {}, sig = sign(), ts: string | string[] | null = String(NOW), now = NOW) =>
  verifyInternalRequest({ ...PARTS, ...over }, ts ?? undefined, sig, SECRET, now);

describe("internal-signature", () => {
  it("bate com o vetor fixo compartilhado com o Admin", () => {
    expect(sign()).toBe(GOLDEN_SIGNATURE);
  });

  it("aceita a requisição exatamente como foi assinada (corpo como string ou Buffer)", () => {
    expect(verify()).toBe(true);
    expect(verify({ body: Buffer.from(PARTS.body) as unknown as string })).toBe(true);
  });

  // A assinatura cobre o que a requisição FAZ: trocar qualquer parte a invalida.
  it.each([
    ["método", { method: "GET" }],
    ["caminho", { path: "/internal/tenants/outro/password-reset-link?x=1" }],
    ["query", { path: "/internal/tenants/abc/password-reset-link?x=2" }],
    ["corpo", { body: '{"actor":"outro@b.com"}' }],
  ])("recusa se o %s for alterado depois de assinar", (_label, change) => {
    expect(verify(change)).toBe(false);
  });

  it("recusa assinatura de outro segredo e timestamp adulterado", () => {
    expect(verify({}, sign({}, NOW, "x".repeat(32)))).toBe(false);
    expect(verify({}, sign({}, NOW - 1000), String(NOW))).toBe(false); // trocou o ts para parecer recente
  });

  it("janela: aceita no limite, recusa expirada e timestamp no futuro", () => {
    const old = NOW - INTERNAL_MAX_AGE_MS;
    expect(verify({}, sign({}, old), String(old))).toBe(true);
    expect(verify({}, sign({}, old - 1), String(old - 1))).toBe(false);
    expect(verify({}, sign({}, NOW + 20_000), String(NOW + 20_000))).toBe(true);
    expect(verify({}, sign({}, NOW + 40_000), String(NOW + 40_000))).toBe(false);
  });

  it.each([
    ["timestamp ausente", null, sign()],
    ["timestamp não numérico", "agora", sign()],
    ["timestamp repetido (array)", [String(NOW), String(NOW)], sign()],
    ["assinatura curta", String(NOW), "abc"],
    ["assinatura não-hex", String(NOW), "z".repeat(64)],
    ["assinatura em maiúsculas", String(NOW), sign().toUpperCase()],
  ])("%s: false, sem lançar exceção", (_label, ts, sig) => {
    expect(() => verify({}, sig, ts as string | null)).not.toThrow();
    expect(verify({}, sig, ts as string | null)).toBe(false);
  });
});
