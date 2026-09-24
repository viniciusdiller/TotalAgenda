import { isValidCpf, normalizeCpf } from "./cpf.util";

describe("isValidCpf", () => {
  it("aceita CPF válido com e sem máscara", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("recusa dígito verificador errado, tamanho errado e sequência repetida", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("000.000.000-00")).toBe(false);
    expect(isValidCpf("529982247250")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });

  it("normalizeCpf devolve só dígitos", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
  });
});
