import { containsNullByte } from "./reject-null-bytes.interceptor";

describe("containsNullByte", () => {
  it("acha NUL em string, objeto e array aninhados", () => {
    expect(containsNullByte("a\u0000b")).toBe(true);
    expect(containsNullByte({ name: "ok", nested: { note: "x\u0000" } })).toBe(true);
    expect(containsNullByte({ tags: ["a", "b\u0000"] })).toBe(true);
    expect(containsNullByte({ "chave\u0000": "valor" })).toBe(true);
  });

  it("não acusa texto normal, nem o literal de barra + u0000 digitado como texto", () => {
    expect(containsNullByte({ name: "Ana", notes: "linha1\nlinha2", tags: ["x"] })).toBe(false);
    expect(containsNullByte(String.fromCharCode(92) + "u0000")).toBe(false);
    expect(containsNullByte(null)).toBe(false);
    expect(containsNullByte(42)).toBe(false);
  });

  it("não recursa sem limite (payload profundo não vira DoS)", () => {
    let deep: unknown = "x\u0000";
    for (let i = 0; i < 50; i++) deep = { a: deep };
    expect(containsNullByte(deep)).toBe(false); // além do teto de profundidade: não desce
  });
});
