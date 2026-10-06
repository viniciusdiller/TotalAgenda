import { allocateDiscount } from "./discount-allocation.util";

describe("allocateDiscount", () => {
  it("rateia proporcionalmente e a soma é exatamente o desconto", () => {
    expect(allocateDiscount([6000, 4000], 1000)).toEqual([600, 400]);
  });

  it("não perde nem cria centavo quando a divisão não é exata (maior resto)", () => {
    const shares = allocateDiscount([3333, 3333, 3334], 100);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
    shares.forEach((s) => expect(Number.isInteger(s)).toBe(true));
  });

  it("empate no resto é determinístico: sobra vai pro item de menor índice", () => {
    expect(allocateDiscount([100, 100, 100], 1)).toEqual([1, 0, 0]);
    expect(allocateDiscount([100, 100, 100], 2)).toEqual([1, 1, 0]);
  });

  it("item único recebe o desconto inteiro", () => {
    expect(allocateDiscount([5000], 700)).toEqual([700]);
  });

  it("desconto zero, negativo ou comanda sem valor não rateia nada", () => {
    expect(allocateDiscount([100, 200], 0)).toEqual([0, 0]);
    expect(allocateDiscount([100, 200], -50)).toEqual([0, 0]);
    expect(allocateDiscount([0, 0], 50)).toEqual([0, 0]);
    expect(allocateDiscount([], 50)).toEqual([]);
  });

  it("desconto maior que o subtotal é limitado ao subtotal (nunca líquido negativo)", () => {
    const shares = allocateDiscount([100, 200], 9999);
    expect(shares).toEqual([100, 200]);
  });
});
