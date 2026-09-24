import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeApiPath } from "./api-path.ts";

describe("isSafeApiPath", () => {
  it("aceita os caminhos que o app realmente monta", () => {
    for (const ok of [
      "/clients",
      "/clients/3f2b8c1e-8a3d-4c55-9d5e-0a1b2c3d4e5f",
      "/public/tenants/meu-salao/services",
      "/appointments?from=2030-01-01T00%3A00%3A00.000Z&to=2030-01-02T00%3A00%3A00.000Z",
      "/finance/entries/abc/settle",
      "/marketplace?q=sal%C3%A3o&city=S%C3%A3o%20Paulo",
    ]) {
      assert.equal(isSafeApiPath(ok), true, ok);
    }
  });

  // Regressão de confused deputy: id/slug vêm do cliente (URL da página ou argumento de Server Action) e
  // são interpolados no caminho da chamada autenticada — não podem mudar o endpoint alvo.
  it("recusa travessia de diretório e suas formas codificadas", () => {
    for (const bad of [
      "/clients/../auth/refresh",
      "/clients/..%2Fauth",
      "/clients/%2e%2e/auth",
      "/clients/%2E%2E%2Fauth",
      "/clients//x",
      "//evil.com/x",
      "/clients/a\\b",
      "/clients/a b",
      "/clients/a#frag",
      "/clients/a%00b",
      "clients/x",
      "http://evil.com/x",
      "",
    ]) {
      assert.equal(isSafeApiPath(bad), false, bad);
    }
  });
});
