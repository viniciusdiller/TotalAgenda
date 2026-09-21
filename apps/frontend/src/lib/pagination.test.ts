import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPageHref, pageWindow, parsePageParam } from "./pagination.ts";

describe("parsePageParam", () => {
  it("aceita inteiros >= 1", () => {
    assert.equal(parsePageParam("3"), 3);
    assert.equal(parsePageParam(["4", "9"]), 4);
  });

  // Regressão de boundary: a página vem da URL, qualquer coisa pode chegar.
  it("lixo, zero, negativo e ausente viram a página 1", () => {
    for (const value of [undefined, "", "abc", "0", "-2", "NaN"]) {
      assert.equal(parsePageParam(value as string | undefined), 1);
    }
  });
});

describe("buildPageHref", () => {
  it("preserva os outros parâmetros e troca só o da paginação", () => {
    const href = buildPageHref("/minha-conta", { aba: "saloes", pagina: "2", x: ["a", "b"] }, "pagina", 3);
    assert.equal(href, "/minha-conta?aba=saloes&x=a&x=b&pagina=3");
  });

  it("página 1 remove o parâmetro pra manter a URL limpa", () => {
    assert.equal(buildPageHref("/minha-conta", { pagina: "4" }, "pagina", 1), "/minha-conta");
    assert.equal(buildPageHref("/minha-conta", { aba: "saloes", pagina: "4" }, "pagina", 1), "/minha-conta?aba=saloes");
  });

  it("uma listagem não reseta a outra na mesma tela", () => {
    const href = buildPageHref("/minha-conta", { proximos: "2", historico: "3" }, "proximos", 1);
    assert.equal(href, "/minha-conta?historico=3");
  });

  it("ignora parâmetros undefined", () => {
    assert.equal(buildPageHref("/x", { a: undefined, b: "1" }, "pagina", 2), "/x?b=1&pagina=2");
  });
});

describe("pageWindow", () => {
  it("poucas páginas: mostra todas", () => {
    assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
    assert.deepEqual(pageWindow(2, 2), [1, 2]);
  });

  it("uma página só", () => {
    assert.deepEqual(pageWindow(1, 1), [1]);
  });

  it("muitas páginas: primeira, última, atual e vizinhas, com reticências", () => {
    assert.deepEqual(pageWindow(6, 12), [1, "…", 5, 6, 7, "…", 12]);
    assert.deepEqual(pageWindow(1, 12), [1, 2, "…", 12]);
    assert.deepEqual(pageWindow(12, 12), [1, "…", 11, 12]);
  });

  it("não coloca reticências entre páginas consecutivas", () => {
    assert.deepEqual(pageWindow(3, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(pageWindow(4, 6), [1, "…", 3, 4, 5, 6]);
  });
});
