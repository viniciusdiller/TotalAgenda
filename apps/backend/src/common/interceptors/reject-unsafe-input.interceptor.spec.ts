import { containsUnsafeInput } from "./reject-unsafe-input.interceptor";

describe("containsUnsafeInput: byte NUL", () => {
  it("acha NUL em string, objeto e array aninhados", () => {
    expect(containsUnsafeInput("a\u0000b")).toBe(true);
    expect(containsUnsafeInput({ name: "ok", nested: { note: "x\u0000" } })).toBe(true);
    expect(containsUnsafeInput({ tags: ["a", "b\u0000"] })).toBe(true);
    expect(containsUnsafeInput({ "chave\u0000": "valor" })).toBe(true);
  });

  it("não acusa texto normal, nem o literal de barra + u0000 digitado como texto", () => {
    expect(containsUnsafeInput({ name: "Ana", notes: "linha1\nlinha2", tags: ["x"] })).toBe(false);
    expect(containsUnsafeInput(String.fromCharCode(92) + "u0000")).toBe(false);
    expect(containsUnsafeInput(null)).toBe(false);
    expect(containsUnsafeInput(42)).toBe(false);
  });

  it("não recursa sem limite (payload profundo não vira DoS)", () => {
    let deep: unknown = "x\u0000";
    for (let i = 0; i < 50; i++) deep = { a: deep };
    expect(containsUnsafeInput(deep)).toBe(false); // além do teto de profundidade: não desce
  });
});

// Regressão (achada no E2E): `{"answers":{"constructor":"x"}}` derrubava o class-transformer com TypeError → 500.
describe("containsUnsafeInput: chaves de protótipo", () => {
  it.each(["constructor", "prototype"])("recusa a chave %s em qualquer nível", (key) => {
    expect(containsUnsafeInput({ [key]: "x" })).toBe(true);
    expect(containsUnsafeInput({ answers: { [key]: "x" } })).toBe(true);
    expect(containsUnsafeInput({ list: [{ [key]: 1 }] })).toBe(true);
  });

  it("recusa __proto__ como chave própria (JSON.parse cria essa chave; o literal {__proto__} não)", () => {
    expect(containsUnsafeInput(JSON.parse('{"a":{"__proto__":{"isAdmin":true}}}'))).toBe(true);
  });

  it("aceita valores com essas palavras e chaves parecidas", () => {
    expect(containsUnsafeInput({ note: "constructor", answers: { constructors: "ok", protoype: "ok" } })).toBe(false);
  });
});
