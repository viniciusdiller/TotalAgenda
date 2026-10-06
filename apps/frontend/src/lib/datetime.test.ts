import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDateTime, formatShortDateTime } from "./datetime.ts";

describe("formatDateTime", () => {
  it("mostra no fuso de São Paulo (UTC-3), não no do ambiente", () => {
    assert.equal(formatDateTime("2026-10-06T13:32:00.000Z"), "06/10/2026 às 10:32");
    assert.equal(formatShortDateTime("2026-10-06T13:32:00.000Z"), "06/10 10:32");
  });

  it("23h30 em SP é o mesmo dia (UTC já virou o dia seguinte)", () => {
    assert.equal(formatDateTime("2026-10-07T02:30:00.000Z"), "06/10/2026 às 23:30");
  });

  it("aceita Date", () => {
    assert.equal(formatDateTime(new Date("2026-10-06T13:32:00.000Z")), "06/10/2026 às 10:32");
  });

  it("vazio ou inválido vira travessão, nunca 'Invalid DateTime'", () => {
    assert.equal(formatDateTime(null), "—");
    assert.equal(formatDateTime(undefined), "—");
    assert.equal(formatDateTime("lixo"), "—");
    assert.equal(formatShortDateTime(""), "—");
  });
});
