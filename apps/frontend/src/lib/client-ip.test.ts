import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_SIG_HEADER,
  CLIENT_IP_TS_HEADER,
  extractClientIp,
  signClientIp,
  signedVisitorHeaders,
} from "./client-ip.ts";

const SECRET = "0123456789abcdef0123456789abcdef";

describe("signClientIp", () => {
  // Vetor fixo, idêntico ao de apps/backend/src/common/utils/client-ip-signature.util.spec.ts:
  // se o algoritmo mudar de um lado só, um dos dois testes quebra.
  it("bate com o vetor fixo compartilhado com o backend", () => {
    assert.equal(
      signClientIp("203.0.113.7", 1_700_000_000_000, SECRET),
      "b044c3f60bfa72210778b1a83c08ad6af87271aa9f36576e7db8bfc23106cead",
    );
  });
});

describe("extractClientIp", () => {
  it("uma entrada (nginx sobrescrevendo com $remote_addr)", () => {
    assert.equal(extractClientIp("203.0.113.7", 1), "203.0.113.7");
  });

  // Regressão de segurança: o cliente pode mandar o próprio X-Forwarded-For; o proxy acrescenta o
  // IP real à direita. Ler a PRIMEIRA entrada deixaria o visitante escolher o IP do seu balde.
  it("ignora entradas à esquerda forjadas pelo cliente", () => {
    assert.equal(extractClientIp("1.2.3.4, 203.0.113.7", 1), "203.0.113.7");
  });

  it("dois proxies confiáveis: pega a segunda entrada a partir da direita", () => {
    assert.equal(extractClientIp("203.0.113.7, 10.0.0.2", 2), "203.0.113.7");
  });

  it("aceita IPv6", () => {
    assert.equal(extractClientIp("2001:db8::1", 1), "2001:db8::1");
  });

  it("menos entradas que saltos, vazio, lixo ou saltos inválidos viram null", () => {
    assert.equal(extractClientIp("203.0.113.7", 2), null);
    assert.equal(extractClientIp("", 1), null);
    assert.equal(extractClientIp(null, 1), null);
    assert.equal(extractClientIp(undefined, 1), null);
    assert.equal(extractClientIp("nao-e-ip", 1), null);
    assert.equal(extractClientIp("203.0.113.7:8080", 1), null);
    assert.equal(extractClientIp("203.0.113.7", 0), null);
    assert.equal(extractClientIp("203.0.113.7", Number.NaN), null);
  });
});

describe("signedVisitorHeaders", () => {
  const NOW = 1_700_000_000_000;

  it("gera os três cabeçalhos com assinatura verificável", () => {
    const headers = signedVisitorHeaders("203.0.113.7", { CLIENT_IP_SECRET: SECRET }, NOW);
    assert.equal(headers[CLIENT_IP_HEADER], "203.0.113.7");
    assert.equal(headers[CLIENT_IP_TS_HEADER], String(NOW));
    assert.equal(headers[CLIENT_IP_SIG_HEADER], signClientIp("203.0.113.7", NOW, SECRET));
  });

  it("sem CLIENT_IP_SECRET não envia nada (comportamento antigo, sem quebrar dev)", () => {
    assert.deepEqual(signedVisitorHeaders("203.0.113.7", {}, NOW), {});
  });

  it("sem IP legível não envia nada (nunca inventa um IP)", () => {
    assert.deepEqual(signedVisitorHeaders(null, { CLIENT_IP_SECRET: SECRET }, NOW), {});
    assert.deepEqual(signedVisitorHeaders("lixo", { CLIENT_IP_SECRET: SECRET }, NOW), {});
  });

  it("respeita TRUSTED_PROXY_HOPS", () => {
    const env = { CLIENT_IP_SECRET: SECRET, TRUSTED_PROXY_HOPS: "2" };
    const headers = signedVisitorHeaders("203.0.113.7, 10.0.0.2", env, NOW);
    assert.equal(headers[CLIENT_IP_HEADER], "203.0.113.7");
  });
});
