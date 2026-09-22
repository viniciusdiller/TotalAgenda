import "reflect-metadata";
import { validateEnv } from "./env.validation";

const base = {
  DATABASE_URL: "postgresql://x",
  TOTALAGENDA_WEBHOOK_SECRET: "webhook-secret",
};

describe("validateEnv", () => {
  it("aceita JWT_SECRET forte", () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: "a".repeat(64) })).not.toThrow();
  });

  // Regressão: JWT_SECRET só exigia "não vazio" — um segredo de 4 caracteres subia normalmente e
  // assina todos os tokens do sistema.
  it("recusa JWT_SECRET curto (fail closed no boot)", () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: "curto" })).toThrow();
    expect(() => validateEnv({ ...base, JWT_SECRET: "a".repeat(31) })).toThrow();
  });

  it("TRUST_PROXY_HOPS é opcional mas, se vier, precisa ser inteiro positivo", () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: "a".repeat(40), TRUST_PROXY_HOPS: "1" })).not.toThrow();
    expect(() => validateEnv({ ...base, JWT_SECRET: "a".repeat(40), TRUST_PROXY_HOPS: "0" })).toThrow();
  });
});
