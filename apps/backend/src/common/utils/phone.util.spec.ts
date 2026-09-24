import { isPlausibleBrazilianPhone, normalizePhone, toWhatsappDigits } from "./phone.util";

describe("normalizePhone", () => {
  it("converge todas as formas de digitação para o mesmo valor", () => {
    expect(normalizePhone("(11) 91234-5678")).toBe("11912345678");
    expect(normalizePhone("+55 11 91234-5678")).toBe("11912345678");
    expect(normalizePhone("5511912345678")).toBe("11912345678");
  });
});

describe("isPlausibleBrazilianPhone", () => {
  it.each(["11912345678", "1132345678", "21987654321", "85991234567"])("aceita %s", (n) => {
    expect(isPlausibleBrazilianPhone(n)).toBe(true);
  });

  it.each([
    ["curto demais", "119123456"],
    ["longo demais", "119123456789"],
    ["DDD com zero", "01912345678"],
    ["DDD terminado em zero", "10912345678"],
    ["celular sem o 9", "11812345678"],
    ["só repetição", "1199999999"],
    ["não numérico", "11abcdefghi"],
    ["vazio", ""],
  ])("recusa %s", (_label, n) => {
    expect(isPlausibleBrazilianPhone(n)).toBe(false);
  });
});

describe("toWhatsappDigits", () => {
  it("sempre devolve com DDI 55, sem duplicar", () => {
    expect(toWhatsappDigits("(11) 91234-5678")).toBe("5511912345678");
    expect(toWhatsappDigits("+55 (11) 91234-5678")).toBe("5511912345678");
  });
  it("devolve vazio para número inválido (nunca um link wa.me quebrado)", () => {
    expect(toWhatsappDigits("123")).toBe("");
    expect(toWhatsappDigits("")).toBe("");
  });
});
