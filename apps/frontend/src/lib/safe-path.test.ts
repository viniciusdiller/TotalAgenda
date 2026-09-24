import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeRedirectPath } from "./safe-path.ts";

describe("isSafeRedirectPath", () => {
  it("aceita caminhos do próprio site", () => {
    for (const ok of ["/", "/descobrir", "/meu-salao/agendar", "/dashboard/agenda?dia=2030-01-01", "/minha-conta#agenda"]) {
      assert.equal(isSafeRedirectPath(ok), true, ok);
    }
  });

  // Regressão: o navegador remove tab/CR/LF e converte "\" em "/" ao navegar, então cada um destes vira
  // "//evil.com" (URL absoluta). A checagem antiga só olhava "//" e "\".
  it("recusa tudo que o navegador normalizaria para outro host", () => {
    for (const bad of [
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
      "/ /evil.com",
      "/\u0000/evil.com",
      "///evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "evil.com",
      "",
      undefined,
      null,
      "/" + "a".repeat(2001),
    ]) {
      assert.equal(isSafeRedirectPath(bad as string), false, JSON.stringify(bad));
    }
  });
});
