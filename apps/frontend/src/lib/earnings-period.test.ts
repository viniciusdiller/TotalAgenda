import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DateTime } from "luxon";
import { resolvePeriod } from "./earnings-period.ts";

const SP = "America/Sao_Paulo";
// 15/10/2026, 10h em São Paulo
const NOW = DateTime.fromISO("2026-10-15T10:00:00", { zone: SP });

describe("resolvePeriod", () => {
  it("sem parâmetro usa o mês corrente inteiro", () => {
    const p = resolvePeriod({}, NOW);
    assert.equal(p.preset, "mes");
    assert.equal(p.fromDate, "2026-10-01");
    assert.equal(p.toDate, "2026-10-31");
    assert.match(p.from, /^2026-10-01T00:00:00/);
    assert.match(p.to, /^2026-10-31T23:59:59/);
  });

  it("hoje = o dia inteiro, no fuso de São Paulo (-03:00)", () => {
    const p = resolvePeriod({ periodo: "hoje" }, NOW);
    assert.equal(p.preset, "hoje");
    assert.equal(p.fromDate, "2026-10-15");
    assert.equal(p.toDate, "2026-10-15");
    assert.match(p.from, /2026-10-15T00:00:00\.000-03:00$/);
    assert.match(p.to, /2026-10-15T23:59:59\.999-03:00$/);
  });

  it("'7d' inclui hoje e os 6 dias anteriores", () => {
    const p = resolvePeriod({ periodo: "7d" }, NOW);
    assert.equal(p.fromDate, "2026-10-09");
    assert.equal(p.toDate, "2026-10-15");
  });

  it("mês passado cruza a virada do ano em janeiro", () => {
    const jan = DateTime.fromISO("2027-01-10T10:00:00", { zone: SP });
    const p = resolvePeriod({ periodo: "mes-passado" }, jan);
    assert.equal(p.preset, "mes-passado");
    assert.equal(p.fromDate, "2026-12-01");
    assert.equal(p.toDate, "2026-12-31");
  });

  // Regressão de fuso: 23h30 em SP já é o dia seguinte em UTC; "hoje" tem que seguir SP.
  it("às 23h30 em São Paulo ainda é 'hoje', mesmo recebendo o instante em UTC", () => {
    const late = DateTime.fromISO("2026-10-15T23:30:00", { zone: SP }).toUTC();
    assert.equal(resolvePeriod({ periodo: "hoje" }, late).fromDate, "2026-10-15");
  });

  it("datas personalizadas válidas são respeitadas", () => {
    const p = resolvePeriod({ de: "2026-09-01", ate: "2026-09-15" }, NOW);
    assert.equal(p.preset, "custom");
    assert.equal(p.fromDate, "2026-09-01");
    assert.equal(p.toDate, "2026-09-15");
  });

  // Valor vindo da URL nunca vira erro 500 nem manda ao backend um intervalo que ele recusaria.
  it("valor inválido cai no mês corrente", () => {
    const casos: Array<[Record<string, string>, string]> = [
      [{ de: "2026-09-20", ate: "2026-09-01" }, "fim antes do início"],
      [{ de: "2026-02-30", ate: "2026-03-10" }, "data inexistente"],
      [{ de: "lixo", ate: "2026-03-10" }, "formato inválido"],
      [{ de: "2024-01-01", ate: "2026-01-01" }, "acima de 366 dias"],
      [{ de: "2026-09-01" }, "só uma ponta"],
    ];
    for (const [params, motivo] of casos) {
      const p = resolvePeriod(params, NOW);
      assert.equal(p.preset, "mes", motivo);
      assert.equal(p.fromDate, "2026-10-01", motivo);
    }
  });

  it("preset desconhecido cai no mês corrente", () => {
    assert.equal(resolvePeriod({ periodo: "ano" }, NOW).preset, "mes");
  });
});
