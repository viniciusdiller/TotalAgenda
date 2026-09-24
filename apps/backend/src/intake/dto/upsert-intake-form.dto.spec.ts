import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { IntakeFieldDto } from "./upsert-intake-form.dto";

const valid = (data: object) => validateSync(plainToInstance(IntakeFieldDto, { label: "Alergias", type: "text", ...data })).length === 0;

describe("IntakeFieldDto.key", () => {
  it("aceita as chaves que o formulário gera (a-z0-9_, inclusive começando por número)", () => {
    expect(valid({ key: "alergias" })).toBe(true);
    expect(valid({ key: "1o_retorno" })).toBe(true);
    expect(valid({ key: "campo_2" })).toBe(true);
  });

  // Regressão: a chave indexa o objeto de respostas (`raw[key]`); `constructor`/`__proto__` liam o protótipo.
  it("recusa chaves que colidem com o protótipo, vazias, longas ou com símbolos", () => {
    for (const key of ["__proto__", "constructor", "prototype", "", "a".repeat(65), "a b", "a-b", "a.b"]) {
      expect(valid({ key })).toBe(false);
    }
  });

  it("limita o tamanho de cada opção do select", () => {
    expect(valid({ key: "k", type: "select", options: ["a", "b"] })).toBe(true);
    expect(valid({ key: "k", type: "select", options: ["x".repeat(201)] })).toBe(false);
  });
});
