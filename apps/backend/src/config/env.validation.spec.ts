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

  describe("CLIENT_IP_SECRET (IP assinado do visitante)", () => {
    const strong = { ...base, JWT_SECRET: "a".repeat(40) };

    it("é opcional fora de produção", () => {
      expect(() => validateEnv(strong)).not.toThrow();
      expect(() => validateEnv({ ...strong, NODE_ENV: "development" })).not.toThrow();
    });

    it("é obrigatório em produção (sem ele o login teria um balde único)", () => {
      expect(() => validateEnv({ ...strong, NODE_ENV: "production" })).toThrow();
      expect(() =>
        validateEnv({ ...strong, NODE_ENV: "production", CLIENT_IP_SECRET: "c".repeat(32) }),
      ).not.toThrow();
    });

    it("se vier, precisa ter 32+ caracteres em qualquer ambiente", () => {
      expect(() => validateEnv({ ...strong, CLIENT_IP_SECRET: "curto" })).toThrow();
      expect(() => validateEnv({ ...strong, CLIENT_IP_SECRET: "c".repeat(32) })).not.toThrow();
    });
  });

  it("TRUST_PROXY_HOPS é opcional mas, se vier, precisa ser inteiro positivo", () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: "a".repeat(40), TRUST_PROXY_HOPS: "1" })).not.toThrow();
    expect(() => validateEnv({ ...base, JWT_SECRET: "a".repeat(40), TRUST_PROXY_HOPS: "0" })).toThrow();
  });
});
