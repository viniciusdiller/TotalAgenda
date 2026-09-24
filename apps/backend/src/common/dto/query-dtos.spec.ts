import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import {
  CashFlowQueryDto,
  ClientSearchQueryDto,
  ListEntriesQueryDto,
  RangeByProfessionalQueryDto,
  TimeBlocksQueryDto,
} from "./query-dtos";

const isValid = (cls: new () => object, plain: unknown) =>
  validateSync(plainToInstance(cls, plain), { whitelist: true, forbidNonWhitelisted: true }).length === 0;

describe("DTOs de @Query", () => {
  it("search aceito como string e recusado como array/objeto (?search=a&search=b, ?search[x]=1)", () => {
    expect(isValid(ClientSearchQueryDto, { search: "ana" })).toBe(true);
    expect(isValid(ClientSearchQueryDto, {})).toBe(true);
    expect(isValid(ClientSearchQueryDto, { search: ["a", "b"] })).toBe(false);
    expect(isValid(ClientSearchQueryDto, { search: { x: "1" } })).toBe(false);
    expect(isValid(ClientSearchQueryDto, { search: "x".repeat(101) })).toBe(false);
  });

  // Regressão: professionalId como objeto ia cru pro Prisma e virava 500 (PrismaClientValidationError
  // não é capturado pelo PrismaExceptionFilter).
  it("professionalId só string; objeto/array viram 400 em vez de 500", () => {
    const range = { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T00:00:00.000Z" };
    expect(isValid(RangeByProfessionalQueryDto, { ...range, professionalId: "3f2b8c1e-8a3d-4c55-9d5e-0a1b2c3d4e5f" })).toBe(true);
    expect(isValid(RangeByProfessionalQueryDto, { ...range, professionalId: { not: "x" } })).toBe(false);
    expect(isValid(RangeByProfessionalQueryDto, { ...range, professionalId: ["a"] })).toBe(false);
    expect(isValid(TimeBlocksQueryDto, { professionalId: { a: 1 } })).toBe(false);
  });

  it("intervalo exige datas ISO válidas e recusa parâmetros não declarados", () => {
    expect(isValid(RangeByProfessionalQueryDto, { from: "lixo", to: "2026-08-31" })).toBe(false);
    expect(isValid(RangeByProfessionalQueryDto, { from: "2026-08-01" })).toBe(false);
    expect(
      isValid(RangeByProfessionalQueryDto, { from: "2026-08-01", to: "2026-08-31", tenantId: "outro" }),
    ).toBe(false);
  });
});

// Regressão: /finance/entries lia @Query("direction"|"status"|"basis") soltos — o ValidationPipe nunca os
// via, e valor inválido era ignorado em silêncio. Agora são DTOs: lista fechada, objeto/array viram 400.
describe("DTOs de query do financeiro", () => {
  it("ListEntriesQueryDto: só valores da lista", () => {
    expect(isValid(ListEntriesQueryDto, {})).toBe(true);
    expect(isValid(ListEntriesQueryDto, { direction: "INCOME", status: "PAID", basis: "paid", from: "2030-01-01", to: "2030-01-31" })).toBe(true);
    expect(isValid(ListEntriesQueryDto, { direction: "OUTRO" })).toBe(false);
    expect(isValid(ListEntriesQueryDto, { status: ["PAID", "PENDING"] })).toBe(false);
    expect(isValid(ListEntriesQueryDto, { basis: { a: 1 } })).toBe(false);
    expect(isValid(ListEntriesQueryDto, { from: "ontem" })).toBe(false);
  });

  it("CashFlowQueryDto: intervalo obrigatório e basis restrito", () => {
    expect(isValid(CashFlowQueryDto, { from: "2030-01-01", to: "2030-01-31", basis: "due" })).toBe(true);
    expect(isValid(CashFlowQueryDto, { from: "2030-01-01" })).toBe(false);
    expect(isValid(CashFlowQueryDto, { from: "2030-01-01", to: "2030-01-31", basis: "x" })).toBe(false);
  });
});
