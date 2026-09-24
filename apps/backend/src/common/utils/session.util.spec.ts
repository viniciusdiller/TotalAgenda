import { isSessionRevoked } from "./session.util";

const CHANGED = new Date("2026-09-24T12:00:00.900Z");
const CHANGED_SEC = Math.floor(CHANGED.getTime() / 1000);

describe("isSessionRevoked", () => {
  it("nunca revoga quando a senha nunca foi trocada", () => {
    expect(isSessionRevoked(1, null)).toBe(false);
    expect(isSessionRevoked(undefined, undefined)).toBe(false);
  });

  it("revoga token emitido antes da troca e aceita depois", () => {
    expect(isSessionRevoked(CHANGED_SEC - 1, CHANGED)).toBe(true);
    expect(isSessionRevoked(CHANGED_SEC + 1, CHANGED)).toBe(false);
  });

  // O token que o próprio /auth/set-password devolve é emitido no mesmo segundo da troca (iat em
  // segundos, passwordChangedAt em ms): comparar em ms revogaria a sessão recém-criada.
  it("token do mesmo segundo da troca vale (compara em segundos inteiros)", () => {
    expect(isSessionRevoked(CHANGED_SEC, CHANGED)).toBe(false);
  });

  it("token sem iat numa conta com senha trocada é revogado (fail closed)", () => {
    expect(isSessionRevoked(undefined, CHANGED)).toBe(true);
  });
});
